import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const usersRouter = new Hono<AppEnv>()
  // Get current user profile — requireAuth only (not requireApproved, so pending users can still load their profile)
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [profile] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));

    if (!profile) {
      // Profile doesn't exist yet — create it (race condition safety)
      const [newProfile] = await db
        .insert(schema.users)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: false,
          role: "referrer",
          isAdmin: false,
          applicationStatus: "incomplete",
          payoutEnabled: false,
          w9Completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();
      return c.json({ user: newProfile }, 200);
    }

    return c.json({ user: profile }, 200);
  })

  // Update profile — requireAuth only
  .patch("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
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

  // Submit application — requireAuth only (pending users can submit their app)
  .post("/me/submit-application", requireAuth, async (c) => {
    const user = c.get("user")!;
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
  })

  // Earnings summary (approved referrers only)
  .get("/earnings", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const allSubs = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.referrerId, user.id));

    const totalEarned = allSubs
      .filter((s) => s.paymentStatus === "transferred" || s.paymentStatus === "fully_paid")
      .reduce((acc, s) => acc + (s.payoutAmount ?? 0), 0);

    const pendingPayout = allSubs
      .filter((s) => s.status === "accepted" && s.paymentStatus !== "transferred" && s.paymentStatus !== "fully_paid")
      .reduce((acc, s) => acc + (s.payoutAmount ?? 0), 0);

    const closedDeals = allSubs.filter((s) => s.status === "closed").length;
    const approvedLeads = allSubs.filter((s) => s.status === "accepted").length;

    const [referrer] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    return c.json({
      stats: { totalEarned, pendingPayout, closedDeals, approvedLeads },
      payoutEnabled: referrer?.payoutEnabled ?? false,
    }, 200);
  });
