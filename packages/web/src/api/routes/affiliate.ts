import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const affiliateRouter = new Hono<AppEnv>()
  // Learning center resources
  .get("/learning", requireAuth, requireApproved, async (c) => {
    const resources = await db
      .select()
      .from(schema.learningResources)
      .where(eq(schema.learningResources.published, true))
      .orderBy(schema.learningResources.order);
    const byCategory: Record<string, typeof resources> = {};
    for (const r of resources) {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    }
    return c.json({ resources, byCategory }, 200);
  })

  // Referral link info
  .get("/referral-link", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    const baseUrl = process.env.WEBSITE_URL || "";
    return c.json({
      referralCode: affiliate?.referralCode,
      referralUrl: `${baseUrl}/sign-up?ref=${affiliate?.referralCode}`,
    }, 200);
  })

  // Override earnings detail
  .get("/overrides", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const overrides = await db
      .select()
      .from(schema.referralOverrides)
      .where(eq(schema.referralOverrides.affiliateId, user.id))
      .orderBy(desc(schema.referralOverrides.createdAt));
    return c.json({ overrides }, 200);
  });
