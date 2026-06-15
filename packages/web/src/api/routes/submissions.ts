import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const submissions = new Hono<AppEnv>()
  // Affiliate: submit a lead
  .post("/", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "affiliate" && !user.isAdmin) {
      return c.json({ error: "Only affiliates can submit leads" }, 403);
    }
    const body = await c.req.json();
    const [listing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, body.listingId));
    if (!listing) return c.json({ error: "Listing not found" }, 404);
    if (listing.status !== "active") return c.json({ error: "Listing is not active" }, 400);

    const fitScore = body.notes && body.notes.length > 50 ? 80 : 50;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + listing.payoutDeadlineDays);

    const [submission] = await db
      .insert(schema.submissions)
      .values({
        listingId: body.listingId,
        affiliateId: user.id,
        leadName: body.leadName,
        leadEmail: body.leadEmail,
        leadPhone: body.leadPhone ?? null,
        leadCompany: body.leadCompany ?? null,
        notes: body.notes ?? null,
        fitScore,
        disclosureSigned: body.disclosureSigned ?? false,
        disclosureSignedAt: body.disclosureSigned ? new Date() : null,
        payoutAmount: listing.payoutAmount,
        paymentDeadline: deadline,
      })
      .returning();

    await db
      .update(schema.listings)
      .set({ totalSubmissions: listing.totalSubmissions + 1, updatedAt: new Date() })
      .where(eq(schema.listings.id, body.listingId));

    return c.json({ submission }, 201);
  })

  // Affiliate: my submitted leads
  .get("/mine", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const rows = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.affiliateId, user.id))
      .orderBy(desc(schema.submissions.createdAt));
    // Join listing title
    const withListings = await Promise.all(rows.map(async (s) => {
      const [listing] = await db.select({ title: schema.listings.title, industry: schema.listings.industry })
        .from(schema.listings).where(eq(schema.listings.id, s.listingId));
      return { ...s, listingTitle: listing?.title, listingIndustry: listing?.industry };
    }));
    return c.json({ submissions: withListings }, 200);
  })

  // Business: incoming leads for review (all their listings)
  .get("/incoming", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    // Get all listings for this business
    const myListings = await db.select({ id: schema.listings.id, title: schema.listings.title })
      .from(schema.listings)
      .where(eq(schema.listings.businessId, user.id));
    const myListingIds = myListings.map((l) => l.id);
    if (!myListingIds.length) return c.json({ submissions: [] }, 200);
    const allSubs = await db.select().from(schema.submissions).orderBy(desc(schema.submissions.createdAt));
    const filtered = allSubs.filter((s) => myListingIds.includes(s.listingId));
    const listingMap = Object.fromEntries(myListings.map((l) => [l.id, l.title]));
    return c.json({ submissions: filtered.map((s) => ({ ...s, listingTitle: listingMap[s.listingId] })) }, 200);
  })

  // Get one submission
  .get("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);
    if (submission.affiliateId !== user.id && !user.isAdmin) {
      const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
      if (listing?.businessId !== user.id) return c.json({ error: "Forbidden" }, 403);
    }
    return c.json({ submission }, 200);
  })

  // Business: update lead status
  .patch("/:id/status", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const body = await c.req.json();
    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);
    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (listing?.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const allowed = ["status", "adminNotes"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(schema.submissions)
      .set(updates)
      .where(eq(schema.submissions.id, id))
      .returning();
    return c.json({ submission: updated }, 200);
  })

  // Poster submissions view (for payments page compat)
  .get("/poster", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const myListings = await db.select({ id: schema.listings.id, title: schema.listings.title })
      .from(schema.listings).where(eq(schema.listings.businessId, user.id));
    const myListingIds = myListings.map((l) => l.id);
    if (!myListingIds.length) return c.json({ submissions: [] }, 200);
    const allSubs = await db.select().from(schema.submissions).orderBy(desc(schema.submissions.createdAt));
    const filtered = allSubs.filter((s) => myListingIds.includes(s.listingId));
    const listingMap = Object.fromEntries(myListings.map((l) => [l.id, l.title]));
    return c.json({ submissions: filtered.map((s) => ({ ...s, listingTitle: listingMap[s.listingId] })) }, 200);
  });
