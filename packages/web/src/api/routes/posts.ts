import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const postsRouter = new Hono<AppEnv>()
  // All: get all published posts (affiliate feed)
  .get("/", requireAuth, requireApproved, async (c) => {
    const rows = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.published, true))
      .orderBy(desc(schema.posts.createdAt));
    return c.json({ posts: rows }, 200);
  })

  // Business: get their own posts (all statuses)
  .get("/mine", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) {
      return c.json({ error: "Only businesses can access this" }, 403);
    }
    const rows = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.businessId, user.id))
      .orderBy(desc(schema.posts.createdAt));
    return c.json({ posts: rows }, 200);
  })

  // Get single post
  .get("/:id", requireAuth, requireApproved, async (c) => {
    const { id } = c.req.param();
    const [post] = await db.select().from(schema.posts).where(eq(schema.posts.id, id));
    if (!post) return c.json({ error: "Not found" }, 404);
    return c.json({ post }, 200);
  })

  // Business: create post
  .post("/", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) {
      return c.json({ error: "Only businesses can create posts" }, 403);
    }
    const body = await c.req.json();
    if (!body.title || !body.body) {
      return c.json({ error: "title and body are required" }, 400);
    }
    const [post] = await db
      .insert(schema.posts)
      .values({
        businessId: user.id,
        businessName: (user as any).companyName || user.name,
        title: body.title,
        body: body.body,
        type: body.type ?? "announcement",
        imageUrl: body.imageUrl ?? null,
        ctaText: body.ctaText ?? null,
        ctaUrl: body.ctaUrl ?? null,
        published: body.published ?? true,
        pinnedUntil: body.pinnedUntil ? new Date(body.pinnedUntil) : null,
      })
      .returning();
    return c.json({ post }, 201);
  })

  // Business: update post
  .patch("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [existing] = await db.select().from(schema.posts).where(eq(schema.posts.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.businessId !== user.id && !user.isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const body = await c.req.json();
    const allowed = ["title", "body", "type", "imageUrl", "ctaText", "ctaUrl", "published", "pinnedUntil"];
    const updates: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) updates[k] = k === "pinnedUntil" && body[k] ? new Date(body[k]) : body[k];
    }
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(schema.posts)
      .set(updates)
      .where(eq(schema.posts.id, id))
      .returning();
    return c.json({ post: updated }, 200);
  })

  // Business: delete post
  .delete("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [existing] = await db.select().from(schema.posts).where(eq(schema.posts.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.businessId !== user.id && !user.isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await db.delete(schema.posts).where(eq(schema.posts.id, id));
    return c.json({ success: true }, 200);
  });
