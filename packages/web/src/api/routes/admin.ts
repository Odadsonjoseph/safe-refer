import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, count, and, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { sendEmail, applicationStatusEmail } from "../services/email";

export const adminRouter = new Hono<AppEnv>()
  // ─── Stats ───────────────────────────────────────────────
  .get("/stats", requireAuth, requireAdmin, async (c) => {
    const [userCount] = await db.select({ count: count() }).from(schema.users);
    const [listingCount] = await db.select({ count: count() }).from(schema.listings);
    const [submissionCount] = await db.select({ count: count() }).from(schema.submissions);
    const pendingApps = await db.select().from(schema.users).where(eq(schema.users.applicationStatus, "submitted"));
    const [affiliates] = await db.select({ count: count() }).from(schema.users).where(eq(schema.users.role, "affiliate"));
    const [businesses] = await db.select({ count: count() }).from(schema.users).where(eq(schema.users.role, "business"));
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
        affiliates: affiliates.count,
        businesses: businesses.count,
        listings: listingCount.count,
        submissions: submissionCount.count,
        pendingApplications: pendingApps.length,
        totalPaidOut: totalPaid,
        pendingPayouts,
      },
    }, 200);
  })

  // ─── Users ───────────────────────────────────────────────
  .get("/users", requireAuth, requireAdmin, async (c) => {
    const { status, role, search } = c.req.query();
    let query = db.select().from(schema.users).$dynamic();

    // Build filters
    const filters = [];
    if (status) filters.push(eq(schema.users.applicationStatus, status as any));
    if (role) filters.push(eq(schema.users.role, role as any));
    if (search) {
      filters.push(
        or(
          ilike(schema.users.name, `%${search}%`),
          ilike(schema.users.email, `%${search}%`)
        )
      );
    }
    if (filters.length > 0) query = query.where(and(...filters));
    const rows = await query.orderBy(desc(schema.users.createdAt));
    return c.json({ users: rows }, 200);
  })

  // Delete user
  .delete("/users/:userId", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    return c.json({ ok: true }, 200);
  })

  // Update user (role, status, isAdmin, payoutEnabled, suspend)
  .patch("/users/:userId", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    const body = await c.req.json();
    const allowed = ["role", "applicationStatus", "isAdmin", "payoutEnabled", "idRejectionReason"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    updates.updatedAt = new Date();
    const [user] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning();
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({ user }, 200);
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
  })

  // ─── Applications ─────────────────────────────────────────
  // Returns all apps; optionally filtered by ?status=submitted|approved|rejected|all
  .get("/applications", requireAuth, requireAdmin, async (c) => {
    const { status } = c.req.query();
    let query = db.select().from(schema.users).$dynamic();
    if (!status || status === "submitted") {
      query = query.where(eq(schema.users.applicationStatus, "submitted"));
    } else if (status !== "all") {
      query = query.where(eq(schema.users.applicationStatus, status as any));
    }
    const rows = await query.orderBy(desc(schema.users.createdAt));
    return c.json({ applications: rows }, 200);
  })

  // Approve / reject with optional reason
  .patch("/applications/:userId", requireAuth, requireAdmin, async (c) => {
    const { userId } = c.req.param();
    const body = await c.req.json();
    let appStatus = body.status as "approved" | "rejected";
    if (!appStatus && body.action) {
      appStatus = body.action === "approve" ? "approved" : "rejected";
    }
    const updates: Record<string, any> = { applicationStatus: appStatus, updatedAt: new Date() };
    if (appStatus === "rejected" && body.reason) {
      updates.idRejectionReason = body.reason;
    }
    const [user] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning() as any[];
    if (!user) return c.json({ error: "User not found" }, 404);
    try {
      const emailData = applicationStatusEmail(user.name, appStatus);
      await sendEmail({ to: user.email, ...emailData });
    } catch (e) {
      console.error("Failed to send application email", e);
    }
    return c.json({ user }, 200);
  })

  // ─── Listings ─────────────────────────────────────────────
  .get("/listings", requireAuth, requireAdmin, async (c) => {
    const rows = await db.select().from(schema.listings).orderBy(desc(schema.listings.createdAt));
    return c.json({ listings: rows }, 200);
  })

  // Toggle listing active/paused
  .patch("/listings/:listingId", requireAuth, requireAdmin, async (c) => {
    const { listingId } = c.req.param();
    const body = await c.req.json();
    const updates: Record<string, any> = { updatedAt: new Date() };
    if ("active" in body) updates.status = body.active ? "active" : "paused";
    if ("status" in body) updates.status = body.status;
    const [listing] = await db
      .update(schema.listings)
      .set(updates)
      .where(eq(schema.listings.id, listingId))
      .returning();
    if (!listing) return c.json({ error: "Listing not found" }, 404);
    return c.json({ listing }, 200);
  })

  // Delete listing
  .delete("/listings/:listingId", requireAuth, requireAdmin, async (c) => {
    const { listingId } = c.req.param();
    await db.delete(schema.listings).where(eq(schema.listings.id, listingId));
    return c.json({ ok: true }, 200);
  })

  // ─── Submissions ──────────────────────────────────────────
  .get("/submissions", requireAuth, requireAdmin, async (c) => {
    const rows = await db.select().from(schema.submissions).orderBy(desc(schema.submissions.createdAt));
    const enriched = await Promise.all(rows.map(async (s) => {
      const [listing] = await db.select({ title: schema.listings.title }).from(schema.listings).where(eq(schema.listings.id, s.listingId));
      const [affiliate] = await db.select({ name: schema.users.name, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, s.affiliateId));
      return {
        ...s,
        listingTitle: listing?.title,
        affiliateName: affiliate?.name,
        affiliateEmail: affiliate?.email,
      };
    }));
    return c.json({ submissions: enriched }, 200);
  })

  // Update submission (status, paymentStatus, adminNotes, payoutAmount)
  .patch("/submissions/:id", requireAuth, requireAdmin, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const allowed = ["status", "paymentStatus", "payoutAmount", "adminNotes", "stripeTransferId"];
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

  // Old payment-specific patch (keep for backwards compat)
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

  // ─── Payouts ──────────────────────────────────────────────
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
        status: schema.submissions.status,
        adminNotes: schema.submissions.adminNotes,
        createdAt: schema.submissions.createdAt,
        acceptedAt: schema.submissions.acceptedAt,
        listingTitle: schema.listings.title,
        affiliateName: schema.users.name,
        affiliateEmail: schema.users.email,
      })
      .from(schema.submissions)
      .leftJoin(schema.listings, eq(schema.submissions.listingId, schema.listings.id))
      .leftJoin(schema.users, eq(schema.submissions.affiliateId, schema.users.id))
      .where(eq(schema.submissions.status, "accepted"))
      .orderBy(desc(schema.submissions.createdAt));
    return c.json({ payouts: subs }, 200);
  })

  .patch("/payouts/:id/mark-paid", requireAuth, requireAdmin, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const [updated] = await db
      .update(schema.submissions)
      .set({
        paymentStatus: "transferred",
        adminNotes: body.adminNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.submissions.id, id))
      .returning();
    return c.json({ submission: updated }, 200);
  })

  // ─── Learning Center ──────────────────────────────────────
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
  });
