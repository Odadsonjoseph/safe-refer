import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth";
import { listings } from "./routes/listings";
import { submissions } from "./routes/submissions";
import { usersRouter } from "./routes/users";
import { adminRouter } from "./routes/admin";
import { stripeRouter } from "./routes/stripe";
import { webhooksRouter } from "./routes/webhooks";
import { affiliateRouter } from "./routes/affiliate";
import { postsRouter } from "./routes/posts";
import { sql } from "drizzle-orm";
import { startJobs } from "./jobs/forfeit";

// Auto-migrate posts table
async function ensurePostsTable() {
  try {
    const { db } = await import("./database");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS posts (
        id text PRIMARY KEY,
        business_id text NOT NULL,
        business_name text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        type text NOT NULL DEFAULT 'announcement',
        image_url text,
        cta_text text,
        cta_url text,
        published boolean NOT NULL DEFAULT true,
        pinned_until timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
  } catch (e: any) {
    // Table may already exist or DB unavailable — non-fatal
    if (!e?.message?.includes("already exists")) {
      console.warn("[migrate] posts table:", e?.message);
    }
  }
}
ensurePostsTable();

const app = new Hono()
  .use(
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
      exposeHeaders: ["set-auth-token"],
    })
  )
  .on(["GET", "POST"], "/api/auth/*", async (c) => {
    const { getAuth } = await import("./auth");
    return getAuth().handler(c.req.raw);
  })
  .route("/webhooks", webhooksRouter)
  .basePath("api")
  .get("/health", (c) => c.json({ status: "ok", ts: Date.now() }, 200))
  .get("/dbtest", async (c) => {
    try {
      const { db } = await import("./database");
      const result = await db.execute(sql`SELECT current_database() as db, now() as ts`);
      return c.json({ ok: true, rows: result as any });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || String(err) }, 500);
    }
  })
  .use("*", authMiddleware)
  .route("/users", usersRouter)
  .route("/listings", listings)
  .route("/submissions", submissions)
  .route("/admin", adminRouter)
  .route("/stripe", stripeRouter)
  .route("/affiliate", affiliateRouter)
  .route("/posts", postsRouter);

export type AppType = typeof app;
export default app;

// Start background jobs
startJobs();
