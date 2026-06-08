import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const listings = new Hono()
  // Public: browse all active listings
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
  // Poster: create listing
  .post("/", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json();
    const [listing] = await db
      .insert(schema.listings)
      .values({
        posterId: user.id,
        title: body.title,
        description: body.description,
        industry: body.industry,
        dealType: body.dealType,
        location: body.location ?? null,
        payoutAmount: body.payoutAmount,
        payoutTrigger: body.payoutTrigger,
        payoutDeadlineDays: body.payoutDeadlineDays ?? 30,
        posterName: user.name,
        posterCompany: user.companyName ?? null,
      })
      .returning();
    return c.json({ listing }, 201);
  })
  // Poster: update listing
  .patch("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const [existing] = await db.select().from(schema.listings).where(eq(schema.listings.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.posterId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json();
    const [updated] = await db
      .update(schema.listings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.listings.id, id))
      .returning();
    return c.json({ listing: updated }, 200);
  })
  // My listings (poster)
  .get("/mine/all", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const rows = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.posterId, user.id))
      .orderBy(desc(schema.listings.createdAt));
    return c.json({ listings: rows }, 200);
  });
