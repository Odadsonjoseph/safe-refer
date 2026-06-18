import { Hono } from "hono";
import type { AppEnv } from "../types";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });
  return _stripe;
}

export const stripeRouter = new Hono<AppEnv>()
  // ─── Stripe Connect onboarding (affiliates) ────────────────────────────────
  .post("/connect/onboard", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const [profile] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    let accountId = profile?.stripeAccountId;
    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: "express",
        email: user.email,
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      await db.update(schema.users).set({ stripeAccountId: accountId }).where(eq(schema.users.id, user.id));
    }

    const link = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.WEBSITE_URL}/payments?refresh=1`,
      return_url: `${process.env.WEBSITE_URL}/payments?success=1`,
      type: "account_onboarding",
    });

    return c.json({ url: link.url }, 200);
  })

  // ─── Check Connect account status ──────────────────────────────────────────
  .get("/connect/status", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [profile] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    if (!profile?.stripeAccountId) return c.json({ connected: false, payoutEnabled: false }, 200);

    const account = await getStripe().accounts.retrieve(profile.stripeAccountId);
    const payoutEnabled = account.payouts_enabled ?? false;

    if (payoutEnabled !== profile.payoutEnabled) {
      await db.update(schema.users).set({ payoutEnabled }).where(eq(schema.users.id, user.id));
    }

    return c.json({ connected: true, payoutEnabled }, 200);
  })

  // ─── STEP 1: Business pays 25% deposit to accept ───────────────────────────
  // Called when business clicks "Accept" on a lead
  .post("/deposit/:submissionId", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const { submissionId } = c.req.param();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submissionId));
    if (!submission) return c.json({ error: "Submission not found" }, 404);
    if (submission.status !== "pending" && submission.status !== "reviewing") {
      return c.json({ error: "Lead is not in a payable state" }, 400);
    }

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (!listing) return c.json({ error: "Listing not found" }, 404);
    if (listing.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    const totalPayout = submission.payoutAmount ?? listing.payoutAmount;
    const depositAmount = Math.round(totalPayout * 0.25 * 100); // 25% in cents

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: depositAmount,
      currency: "usd",
      metadata: {
        submissionId,
        listingId: listing.id,
        affiliateId: submission.affiliateId,
        type: "deposit",
        totalPayout: String(totalPayout),
      },
    });

    await db.update(schema.submissions).set({
      stripePaymentIntentId: paymentIntent.id,
      depositAmount: totalPayout * 0.25,
      finalAmount: totalPayout * 0.75,
      updatedAt: new Date(),
    }).where(eq(schema.submissions.id, submissionId));

    return c.json({ clientSecret: paymentIntent.client_secret, depositAmount: totalPayout * 0.25 }, 200);
  })

  // ─── STEP 2: Business pays remaining 75% after close ──────────────────────
  .post("/final/:submissionId", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const { submissionId } = c.req.param();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submissionId));
    if (!submission) return c.json({ error: "Submission not found" }, 404);
    if (submission.status !== "closed") return c.json({ error: "Lead must be marked closed first" }, 400);
    if (submission.paymentStatus !== "deposit_paid") {
      return c.json({ error: "Deposit must be paid before final payment" }, 400);
    }

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (listing?.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    const finalAmountCents = Math.round((submission.finalAmount ?? 0) * 100);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: finalAmountCents,
      currency: "usd",
      metadata: {
        submissionId,
        listingId: listing?.id,
        affiliateId: submission.affiliateId,
        type: "final",
      },
    });

    await db.update(schema.submissions).set({
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
    }).where(eq(schema.submissions.id, submissionId));

    return c.json({ clientSecret: paymentIntent.client_secret, finalAmount: submission.finalAmount }, 200);
  });
