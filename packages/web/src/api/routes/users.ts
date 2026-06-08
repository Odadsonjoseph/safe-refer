import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, sum } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const usersRouter = new Hono()
  // Get current user profile
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const [profile] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    if (!profile) return c.json({ error: "User not found" }, 404);
    return c.json({ user: profile }, 200);
  })
  // Update profile
  .patch("/me", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json();

    const allowed = [
      "name", "phone", "role", "bio", "skills", "linkedinUrl",
      "companyName", "companyWebsite", "companySize", "industry",
      "idFrontUrl", "idBackUrl", "selfieUrl",
      "w9LegalName", "w9Ssn", "w9Address", "w9City", "w9State", "w9Zip", "w9Completed",
    ];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updatedAt = new Date();

    // If profile is complete enough, move to submitted
    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    if (current?.applicationStatus === "incomplete" && body.phone && body.w9Completed) {
      updates.applicationStatus = "submitted";
    }

    const [updated] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, user.id))
      .returning();

    return c.json({ user: updated }, 200);
  })
  // Get earnings summary (referrers)
  .get("/earnings", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const allSubs = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.referrerId, user.id));

    const totalEarned = allSubs
      .filter((s) => s.paymentStatus === "transferred" || s.paymentStatus === "fully_paid")
      .reduce((acc, s) => acc + (s.payoutAmount ?? 0), 0);

    const pendingPayout = allSubs
      .filter((s) => s.status === "approved" && s.paymentStatus !== "transferred" && s.paymentStatus !== "fully_paid")
      .reduce((acc, s) => acc + (s.payoutAmount ?? 0), 0);

    const closedDeals = allSubs.filter((s) => s.status === "closed" || s.status === "paid").length;
    const approvedLeads = allSubs.filter((s) => s.status === "approved").length;

    const [referrer] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    const history = allSubs
      .filter((s) => s.paymentStatus === "transferred" || s.paymentStatus === "fully_paid")
      .map((s) => ({
        id: s.id,
        amount: s.payoutAmount ?? 0,
        paidAt: s.updatedAt,
        listingTitle: s.listingId, // will be enriched below
      }));

    return c.json({
      stats: { totalEarned, pendingPayout, closedDeals, approvedLeads },
      history,
      payoutEnabled: referrer?.payoutEnabled ?? false,
    }, 200);
  })
  // Submit application
  .post("/me/submit-application", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    if (!current) return c.json({ error: "User not found" }, 404);
    if (current.applicationStatus !== "incomplete") {
      return c.json({ error: "Application already submitted" }, 400);
    }
    const [updated] = await db
      .update(schema.users)
      .set({ applicationStatus: "submitted", updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning();
    return c.json({ user: updated }, 200);
  });
