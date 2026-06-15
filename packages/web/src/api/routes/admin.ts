import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { sendEmail, applicationStatusEmail } from "../services/email";

export const adminRouter = new Hono<AppEnv>()
  // Platform stats
  .get("/stats", requireAuth, requireAdmin, async (c) => {
    const [userCount] = await db.select({ count: count() }).from(schema.users);
    const [listingCount] = await db.select({ count: count() }).from(schema.listings);
    const [submissionCount] = await db.select({ count: count() }).from(schema.submissions);
    const pendingApps = await db.select().from(schema.users).where(eq(schema.users.applicationStatus, "submitted"));
    const affiliates = await db.select({ count: count() }).from(schema.users).where(eq(schema.users.role, "affiliate"));
    const businesses = await db.select({ count: count() }).from(schema.users).where(eq(schema.users.role, "business"));
    const allSubs = await db.select().from(schema.submissions);
    const totalPaid = allSubs
      .filter((s) => s.paymentStatus === "transferred" || s.paymentStatus === "fully_paid")
      .reduce((a, s) => a + (s.payoutAmount ?? 0), 0);
    const pendingPayouts = allSubs
      .filter((s) => s.status === "accepted" && s.paymentStatus === "unpaid")
      .reduce((a, s) => a + (s.payoutAmount ?? 0), 0);

    return c.json({
      stats: {
        users: userCount.count,
        affiliates: affiliates[0].count,
        businesses: businesses[0].count,
        listings: listingCount.count,
        submissions: submissionCount.count,
        pendingApplications: pendingApps.length,
        totalPaidOut: totalPaid,
        pendingPayouts,
      },
    }, 200);
  })

  // All users
  .get("/users", requireAuth, requireAdmin, async (c) => {
    const rows = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
    return c.json({ users: rows }, 200);
  })

  // Pending applications (businesses only need approval)
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
    const rows = await db.select().from(schema.listings).orderBy(desc(schema.listings.createdAt));
    return c.json({ listings: rows }, 200);
  })

  // All submissions with payout management
  .get("/submissions", requireAuth, requireAdmin, async (c) => {
    const rows = await db.select().from(schema.submissions).orderBy(desc(schema.submissions.createdAt));
    // Enrich with listing title + affiliate name
    const enriched = await Promise.all(rows.map(async (s) => {
      const [listing] = await db.select({ title: schema.listings.title }).from(schema.listings).where(eq(schema.listings.id, s.listingId));
      const [affiliate] = await db.select({ name: schema.users.name, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, s.affiliateId));
      return { ...s, listingTitle: listing?.title, affiliateName: affiliate?.name, affiliateEmail: affiliate?.email };
    }));
    return c.json({ submissions: enriched }, 200);
  })

  // Payout management: update payment status
  .patch("/submissions/:id/payment", requireAuth, requireAdmin, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const allowed = ["paymentStatus", "payoutAmount", "adminNotes", "stripeTransferId"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(schema.submissions)
      .set(updates)
      .where(eq(schema.submissions.id, id))
      .returning();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json({ submission: updated }, 200);
  })

  // Toggle admin status
  .patch("/users/:userId/admin", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    const body = await c.req.json();
    const [user] = await db
      .update(schema.users)
      .set({ isAdmin: body.isAdmin, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return c.json({ user }, 200);
  })

  // Update user role/status
  .patch("/users/:userId", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    const body = await c.req.json();
    const allowed = ["role", "applicationStatus", "isAdmin", "payoutEnabled"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    updates.updatedAt = new Date();
    const [user] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning();
    return c.json({ user }, 200);
  })

  // Learning center CRUD
  .get("/learning", requireAuth, requireAdmin, async (c) => {
    const resources = await db.select().from(schema.learningResources).orderBy(schema.learningResources.order);
    return c.json({ resources }, 200);
  })
  .post("/learning", requireAuth, requireAdmin, async (c) => {
    const body = await c.req.json();
    const [resource] = await db.insert(schema.learningResources).values({
      title: body.title,
      description: body.description ?? null,
      url: body.url ?? null,
      videoUrl: body.videoUrl ?? null,
      category: body.category ?? "general",
      order: body.order ?? 0,
      published: body.published ?? true,
    }).returning();
    return c.json({ resource }, 201);
  })
  .patch("/learning/:id", requireAuth, requireAdmin, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const allowed = ["title", "description", "url", "videoUrl", "category", "order", "published"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    const [resource] = await db.update(schema.learningResources).set(updates).where(eq(schema.learningResources.id, id)).returning();
    return c.json({ resource }, 200);
  })
  .delete("/learning/:id", requireAuth, requireAdmin, async (c) => {
    const { id } = c.req.param();
    await db.delete(schema.learningResources).where(eq(schema.learningResources.id, id));
    return c.json({ ok: true }, 200);
  })

  // Payout management — accepted submissions with payment pending
  .get("/payouts", requireAuth, requireAdmin, async (c) => {
    const subs = await db
      .select({
        id: schema.submissions.id,
        leadName: schema.submissions.leadName,
        leadEmail: schema.submissions.leadEmail,
        listingId: schema.submissions.listingId,
        affiliateId: schema.submissions.affiliateId,
        payoutAmount: schema.submissions.payoutAmount,
        paymentStatus: schema.submissions.paymentStatus,
        createdAt: schema.submissions.createdAt,
        listingTitle: schema.listings.title,
        affiliateName: schema.users.name,
      })
      .from(schema.submissions)
      .leftJoin(schema.listings, eq(schema.submissions.listingId, schema.listings.id))
      .leftJoin(schema.users, eq(schema.submissions.affiliateId, schema.users.id))
      .where(eq(schema.submissions.status, "accepted"))
      .orderBy(desc(schema.submissions.createdAt));
    return c.json({ payouts: subs }, 200);
  })

  // Mark payout as transferred
  .patch("/payouts/:id/mark-paid", requireAuth, requireAdmin, async (c) => {
    const { id } = c.req.param();
    const [updated] = await db
      .update(schema.submissions)
      .set({ paymentStatus: "transferred" })
      .where(eq(schema.submissions.id, id))
      .returning();
    return c.json({ submission: updated }, 200);
  });
