import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, sql } from "drizzle-orm";
import { sendNotification, notifyTemplates } from "../services/notifications";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });
  return _stripe;
}

export const webhooksRouter = new Hono()
  .post("/stripe", async (c) => {
    const sig = c.req.header("stripe-signature");
    const body = await c.req.text();

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      return c.json({ error: `Webhook Error: ${err.message}` }, 400);
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { submissionId, affiliateId, type, totalPayout } = pi.metadata;
      if (!submissionId) return c.json({ received: true }, 200);

      const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submissionId)) as any[];
      if (!submission) return c.json({ received: true }, 200);

      // ── Deposit paid (25%) ─────────────────────────────────────────────────
      if (type === "deposit") {
        await db.update(schema.submissions).set({
          status: "accepted",
          paymentStatus: "deposit_paid",
          updatedAt: new Date(),
        }).where(eq(schema.submissions.id, submissionId));

        // Notify affiliate (push + email) + business (push)
        try {
          const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, affiliateId));
          const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
          const depositAmount = pi.amount / 100;

          if (affiliate) {
            const { depositPaidEmail } = await import("../services/email");
            await sendNotification({
              pushToken: affiliate.expoPushToken,
              email: affiliate.email,
              emailTemplate: depositPaidEmail(affiliate.name, submission.leadName, depositAmount, listing?.title || ""),
              push: notifyTemplates.leadAccepted(submission.leadName, depositAmount).push,
            });
          }

          // Notify business: deposit confirmed, contact info unlocked
          if (listing) {
            const [biz] = await db.select().from(schema.users).where(eq(schema.users.id, listing.businessId));
            if (biz) {
              await sendNotification({
                pushToken: biz.expoPushToken,
                push: notifyTemplates.depositReceived(submission.leadName).push,
              });
            }
          }
        } catch (e) {
          console.error("[webhook] deposit notify failed:", e);
        }
      }

      // ── Final payment (75%) ───────────────────────────────────────────────
      if (type === "final") {
        await db.update(schema.submissions).set({
          paymentStatus: "fully_paid",
          updatedAt: new Date(),
        }).where(eq(schema.submissions.id, submissionId));

        try {
          const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, affiliateId)) as any[];
          if (affiliate?.stripeAccountId && affiliate?.payoutEnabled) {
            const transferAmount = Math.round(pi.amount * 0.96);
            const transfer = await getStripe().transfers.create({
              amount: transferAmount,
              currency: "usd",
              destination: affiliate.stripeAccountId,
              transfer_group: submissionId,
            });

            await db.update(schema.submissions).set({
              stripeTransferId: transfer.id,
              paymentStatus: "transferred",
              payoutAmount: transferAmount / 100,
              updatedAt: new Date(),
            }).where(eq(schema.submissions.id, submissionId));

            // Update listing stats
            await db.update(schema.listings).set({
              closedDeals: sql`${schema.listings.closedDeals} + 1`,
              totalPaidOut: sql`${schema.listings.totalPaidOut} + ${transferAmount / 100}`,
              updatedAt: new Date(),
            }).where(eq(schema.listings.id, submission.listingId));

            // Notify affiliate: paid out (push + email)
            const { payoutTransferredEmail } = await import("../services/email");
            await sendNotification({
              pushToken: affiliate.expoPushToken,
              email: affiliate.email,
              emailTemplate: payoutTransferredEmail(affiliate.name, submission.leadName, transferAmount / 100),
              push: notifyTemplates.payoutTransferred(transferAmount / 100, submission.leadName).push,
            });
          }
        } catch (e) {
          console.error("[webhook] final transfer failed:", e);
        }
      }
    }

    return c.json({ received: true }, 200);
  });
