import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { sendEmail, applicationStatusEmail } from "../services/email";

export const adminRouter = new Hono<AppEnv>()
  // Stats overview
  .get("/stats", requireAuth, requireAdmin, async (c) => {
    const [userCount] = await db.select({ count: count() }).from(schema.users);
    const [listingCount] = await db.select({ count: count() }).from(schema.listings);
    const [submissionCount] = await db.select({ count: count() }).from(schema.submissions);

    const pendingApps = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.applicationStatus, "submitted"));

    return c.json({
      stats: {
        users: userCount.count,
        listings: listingCount.count,
        submissions: submissionCount.count,
        pendingApplications: pendingApps.length,
      },
    }, 200);
  })
  // All users
  .get("/users", requireAuth, requireAdmin, async (c) => {
    const rows = await db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));
    return c.json({ users: rows }, 200);
  })
  // Pending applications
  .get("/applications", requireAuth, requireAdmin, async (c) => {
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.applicationStatus, "submitted"))
      .orderBy(desc(schema.users.createdAt));
    return c.json({ applications: rows }, 200);
  })
  // Approve / reject application
  .patch("/applications/:userId", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    const body = await c.req.json();
    // Support both { status: "approved" } and { action: "approve" } formats
    let status = body.status as "approved" | "rejected";
    if (!status && body.action) {
      status = body.action === "approve" ? "approved" : "rejected";
    }

    const [user] = await db
      .update(schema.users)
      .set({ applicationStatus: status, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning() as any[];

    if (!user) return c.json({ error: "User not found" }, 404);

    try {
      const emailData = applicationStatusEmail(user.name, status);
      await sendEmail({ to: user.email, ...emailData });
    } catch (e) {
      console.error("Failed to send application email", e);
    }

    return c.json({ user }, 200);
  })
  // All listings
  .get("/listings", requireAuth, requireAdmin, async (c) => {
    const rows = await db
      .select()
      .from(schema.listings)
      .orderBy(desc(schema.listings.createdAt));
    return c.json({ listings: rows }, 200);
  })
  // All submissions
  .get("/submissions", requireAuth, requireAdmin, async (c) => {
    const rows = await db
      .select()
      .from(schema.submissions)
      .orderBy(desc(schema.submissions.createdAt));
    return c.json({ submissions: rows }, 200);
  })
  // Toggle admin
  .patch("/users/:userId/admin", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    const body = await c.req.json();
    const [user] = await db
      .update(schema.users)
      .set({ isAdmin: body.isAdmin, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return c.json({ user }, 200);
  });
