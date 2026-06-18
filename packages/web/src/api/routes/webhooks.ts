import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, sql } from "drizzle-orm";

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
        // Unlock contact info, move to accepted, set 48h deadline on close
        await db.update(schema.submissions).set({
          status: "accepted",
          paymentStatus: "deposit_paid",
          updatedAt: new Date(),
        }).where(eq(schema.submissions.id, submissionId));

        // Notify affiliate
        try {
          const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, affiliateId));
          const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
          if (affiliate?.email) {
            const { sendEmail, depositPaidEmail } = await import("../services/email");
            const tmpl = depositPaidEmail(affiliate.name, submission.leadName, pi.amount / 100, listing?.title || "");
            await sendEmail({ to: affiliate.email, ...tmpl });
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

        // Transfer 96% to affiliate (platform keeps 4%)
        try {
          const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, affiliateId)) as any[];
          if (affiliate?.stripeAccountId && affiliate?.payoutEnabled) {
            const totalPayoutNum = Number(totalPayout || 0);
            // Affiliate gets 96% of FULL payout (deposit already paid to platform, so transfer 96% of final)
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

            // Email affiliate
            const { sendEmail, payoutTransferredEmail } = await import("../services/email");
            const tmpl = payoutTransferredEmail(affiliate.name, submission.leadName, transferAmount / 100);
            await sendEmail({ to: affiliate.email, ...tmpl }).catch(console.error);
          }
        } catch (e) {
          console.error("[webhook] final transfer failed:", e);
        }
      }
    }

    return c.json({ received: true }, 200);
  });
