import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

export const stripeRouter = new Hono()
  // Create Stripe Connect onboarding link (referrers)
  .post("/connect/onboard", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const [profile] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    let accountId = profile?.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      await db.update(schema.users).set({ stripeAccountId: accountId }).where(eq(schema.users.id, user.id));
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.WEBSITE_URL}/payments?refresh=1`,
      return_url: `${process.env.WEBSITE_URL}/payments?success=1`,
      type: "account_onboarding",
    });

    return c.json({ url: link.url }, 200);
  })
  // Check Connect account status
  .get("/connect/status", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const [profile] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    if (!profile?.stripeAccountId) return c.json({ connected: false, payoutEnabled: false }, 200);

    const account = await stripe.accounts.retrieve(profile.stripeAccountId);
    const payoutEnabled = account.payouts_enabled ?? false;

    if (payoutEnabled !== profile.payoutEnabled) {
      await db.update(schema.users).set({ payoutEnabled }).where(eq(schema.users.id, user.id));
    }

    return c.json({ connected: true, payoutEnabled }, 200);
  })
  // Create payment intent for a submission (poster pays)
  .post("/pay/:submissionId", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const { submissionId } = c.req.param();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submissionId));
    if (!submission) return c.json({ error: "Submission not found" }, 404);

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (!listing) return c.json({ error: "Listing not found" }, 404);
    if (listing.posterId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const amountCents = Math.round((submission.payoutAmount ?? listing.payoutAmount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      metadata: { submissionId, listingId: listing.id, referrerId: submission.referrerId },
    });

    await db
      .update(schema.submissions)
      .set({ stripePaymentIntentId: paymentIntent.id, updatedAt: new Date() })
      .where(eq(schema.submissions.id, submissionId));

    return c.json({ clientSecret: paymentIntent.client_secret }, 200);
  });
