/**
 * Forfeit Job — runs every 5 minutes
 * If a closed submission's 48h payment deadline has passed and payment is still deposit_paid,
 * the deposit is automatically forfeited to the affiliate as their full payout.
 */
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, lt, and } from "drizzle-orm";
import Stripe from "stripe";
import { sendNotification, notifyTemplates } from "../services/notifications";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
  }
  return _stripe;
}

export async function runQualificationExpiryJob() {
  // Auto-reject leads in "reviewing" that have passed their qualification window
  try {
    const now = new Date();
    const expiredReviewing = await db
      .select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.status, "reviewing"),
          lt(schema.submissions.qualifiedDeadline, now)
        )
      );

    for (const sub of expiredReviewing) {
      console.log(`[qualify-expiry] Submission ${sub.id} — qualification window expired, auto-rejecting`);
      try {
        await db.update(schema.submissions).set({
          status: "rejected",
          adminNotes: "Auto-rejected: qualification window expired without business marking lead qualified.",
          updatedAt: new Date(),
        }).where(eq(schema.submissions.id, sub.id));
      } catch (e) {
        console.error(`[qualify-expiry] Failed for submission ${sub.id}:`, e);
      }
    }
  } catch (e) {
    console.error("[qualify-expiry] Job error:", e);
  }
}

export async function runForfeitJob() {
  try {
    const now = new Date();
    // Find all closed subs where deadline has passed and deposit was paid but not fully paid
    const expired = await db
      .select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.status, "closed"),
          eq(schema.submissions.paymentStatus, "deposit_paid"),
          lt(schema.submissions.paymentDeadline, now)
        )
      );

    for (const sub of expired) {
      console.log(`[forfeit] Processing submission ${sub.id} — deadline passed`);
      try {
        // Mark forfeited immediately to prevent re-processing
        await db.update(schema.submissions).set({
          status: "forfeited",
          paymentStatus: "forfeited",
          updatedAt: new Date(),
        }).where(eq(schema.submissions.id, sub.id));

        const stripe = getStripe();
        if (!stripe) continue;

        // Fetch affiliate
        const [affiliate] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, sub.affiliateId)) as any[];

        if (affiliate?.stripeAccountId && affiliate?.payoutEnabled && sub.depositAmount) {
          // Transfer the deposit to affiliate as forfeit
          const transferAmount = Math.round(sub.depositAmount * 0.96 * 100); // 96% to affiliate
          const transfer = await stripe.transfers.create({
            amount: transferAmount,
            currency: "usd",
            destination: affiliate.stripeAccountId,
            transfer_group: sub.id,
            metadata: { type: "forfeit", submissionId: sub.id },
          });

          await db.update(schema.submissions).set({
            stripeTransferId: transfer.id,
            payoutAmount: transferAmount / 100,
            updatedAt: new Date(),
          }).where(eq(schema.submissions.id, sub.id));

          // Notify affiliate: forfeit received (push + email)
          const { forfeitEmail } = await import("../services/email");
          await sendNotification({
            pushToken: affiliate.expoPushToken,
            email: affiliate.email,
            emailTemplate: forfeitEmail(affiliate.name, sub.leadName, transferAmount / 100),
            push: notifyTemplates.forfeitReceived(transferAmount / 100, sub.leadName).push,
          });
        }
      } catch (e) {
        console.error(`[forfeit] Failed for submission ${sub.id}:`, e);
      }
    }
  } catch (e) {
    console.error("[forfeit] Job error:", e);
  }
}

// Send 24h reminder emails to businesses approaching deadline
export async function runDeadlineReminderJob() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Subs closing within the next 24-25h window
    const approaching = await db
      .select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.status, "closed"),
          eq(schema.submissions.paymentStatus, "deposit_paid"),
          lt(schema.submissions.paymentDeadline, in25h)
        )
      );

    for (const sub of approaching) {
      if (!sub.paymentDeadline) continue;
      const deadline = new Date(sub.paymentDeadline);
      const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft < 0 || hoursLeft > 25) continue;

      try {
        const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, sub.listingId));
        if (!listing) continue;
        const [business] = await db.select().from(schema.users).where(eq(schema.users.id, listing.businessId));
        if (!business?.email) continue;

        const { closedDeadlineReminderEmail } = await import("../services/email");
        await sendNotification({
          pushToken: business.expoPushToken,
          email: business.email,
          emailTemplate: closedDeadlineReminderEmail(business.name, sub.leadName, hoursLeft),
          push: notifyTemplates.paymentDeadlineReminder(sub.leadName, hoursLeft).push,
        });
      } catch (e) {
        console.error(`[reminder] Failed for submission ${sub.id}:`, e);
      }
    }
  } catch (e) {
    console.error("[reminder] Job error:", e);
  }
}

export function startJobs() {
  const FIVE_MINUTES = 5 * 60 * 1000;
  console.log("[jobs] Starting forfeit + reminder + qualification-expiry jobs (every 5 min)");
  setInterval(runForfeitJob, FIVE_MINUTES);
  setInterval(runDeadlineReminderJob, FIVE_MINUTES);
  setInterval(runQualificationExpiryJob, FIVE_MINUTES);
  // Run once immediately on startup
  runForfeitJob().catch(console.error);
  runQualificationExpiryJob().catch(console.error);
}
