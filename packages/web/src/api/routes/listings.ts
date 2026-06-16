import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const listings = new Hono<AppEnv>()
  // Marketplace: browse all active offers (affiliates)
  .get("/", requireAuth, requireApproved, async (c) => {
    const rows = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.status, "active"))
      .orderBy(desc(schema.listings.createdAt));
    return c.json({ listings: rows }, 200);
  })

  // Get one listing
  .get("/:id", requireAuth, requireApproved, async (c) => {
    const { id } = c.req.param();
    const [listing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, id));
    if (!listing) return c.json({ error: "Not found" }, 404);
    return c.json({ listing }, 200);
  })

  // Business: create offer
  .post("/", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) {
      return c.json({ error: "Only businesses can post offers" }, 403);
    }
    const body = await c.req.json();
    const [listing] = await db
      .insert(schema.listings)
      .values({
        businessId: user.id,
        title: body.title,
        description: body.description,
        industry: body.industry,
        dealType: body.dealType,
        location: body.location ?? null,
        payoutAmount: body.payoutAmount,
        payoutTrigger: body.payoutTrigger,
        payoutDeadlineDays: body.payoutDeadlineDays ?? 30,
        requirements: body.requirements ?? null,
        targetAudience: body.targetAudience ?? null,
        businessName: user.name,
        businessCompany: (user as any).companyName ?? null,
      })
      .returning();
    return c.json({ listing }, 201);
  })

  // Business: update offer
  .patch("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [existing] = await db.select().from(schema.listings).where(eq(schema.listings.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json();
    const allowed = ["title", "description", "industry", "dealType", "location", "payoutAmount",
      "payoutTrigger", "payoutDeadlineDays", "requirements", "targetAudience", "status"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(schema.listings)
      .set(updates)
      .where(eq(schema.listings.id, id))
      .returning();
    return c.json({ listing: updated }, 200);
  })

  // Business: my offers
  .get("/mine/all", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const rows = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.businessId, user.id))
      .orderBy(desc(schema.listings.createdAt));
    return c.json({ listings: rows }, 200);
  })

  // Business: submissions for a specific listing (leads review)
  .get("/:id/submissions", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, id));
    if (!listing) return c.json({ error: "Not found" }, 404);
    if (listing.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const rows = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.listingId, id))
      .orderBy(desc(schema.submissions.createdAt));
    return c.json({ submissions: rows }, 200);
  })

  // Business: delete a listing
  .delete("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [existing] = await db.select().from(schema.listings).where(eq(schema.listings.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    // soft delete — just close it
    await db.update(schema.listings).set({ status: "closed", updatedAt: new Date() }).where(eq(schema.listings.id, id));
    return c.json({ success: true }, 200);
  })

  // Business: analytics for their offers
  .get("/mine/analytics", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const myListings = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.businessId, user.id));
    const allSubs = await db
      .select()
      .from(schema.submissions);
    const myListingIds = new Set(myListings.map((l) => l.id));
    const mySubs = allSubs.filter((s) => myListingIds.has(s.listingId));

    return c.json({
      totalListings: myListings.length,
      activeListings: myListings.filter((l) => l.status === "active").length,
      totalSubmissions: mySubs.length,
      pendingReview: mySubs.filter((s) => s.status === "pending" || s.status === "reviewing").length,
      accepted: mySubs.filter((s) => s.status === "accepted").length,
      rejected: mySubs.filter((s) => s.status === "rejected").length,
      closed: mySubs.filter((s) => s.status === "closed").length,
      totalPaidOut: myListings.reduce((a, l) => a + l.totalPaidOut, 0),
    }, 200);
  });
