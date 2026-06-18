import { createMiddleware } from "hono/factory";
import { getAuth } from "../auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../types";

// auth and db are lazy proxies — importing them here is safe (no connection at import time)

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  try {
    const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
    if (session?.user) {
      try {
        const [profile] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, session.user.id));
        const enriched = profile ? { ...session.user, ...profile } : session.user;
        c.set("user", enriched as any);
      } catch {
        c.set("user", session.user as any);
      }
      c.set("session", session.session);
    } else {
      c.set("user", null);
      c.set("session", null);
    }
  } catch (e) {
    console.error("[authMiddleware] error:", e);
    c.set("user", null);
    c.set("session", null);
  }
  return next();
});

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) return c.json({ error: "Unauthorized" }, 401);
  return next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!user.isAdmin) return c.json({ error: "Forbidden" }, 403);
  return next();
});

export const requireApproved = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (user.applicationStatus !== "approved" && !user.isAdmin) {
    return c.json({ error: "Account pending approval", code: "PENDING_APPROVAL" }, 403);
  }
  return next();
});
