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
      const { submissionId, referrerId } = pi.metadata;
      if (!submissionId) return c.json({ received: true }, 200);

      const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submissionId)) as any[];
      if (!submission) return c.json({ received: true }, 200);

      // Mark paid, transfer to referrer
      await db.update(schema.submissions).set({
        paymentStatus: "fully_paid",
        status: "closed",
        updatedAt: new Date(),
      }).where(eq(schema.submissions.id, submissionId));

      // Transfer to referrer if they have a Connect account
      try {
        const [referrer] = await db.select().from(schema.users).where(eq(schema.users.id, referrerId)) as any[];
        if (referrer?.stripeAccountId && referrer?.payoutEnabled) {
          const transfer = await getStripe().transfers.create({
            amount: pi.amount,
            currency: "usd",
            destination: referrer.stripeAccountId,
            transfer_group: submissionId,
          });
          await db.update(schema.submissions).set({
            stripeTransferId: transfer.id,
            paymentStatus: "transferred",
            updatedAt: new Date(),
          }).where(eq(schema.submissions.id, submissionId));

          // Update listing stats (increment)
          await db.update(schema.listings).set({
            closedDeals: sql`${schema.listings.closedDeals} + 1`,
            totalPaidOut: sql`${schema.listings.totalPaidOut} + ${pi.amount / 100}`,
            updatedAt: new Date(),
          }).where(eq(schema.listings.id, submission.listingId));
        }
      } catch (e) {
        console.error("Transfer failed:", e);
      }
    }

    return c.json({ received: true }, 200);
  });
