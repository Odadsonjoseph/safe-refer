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
import { sql } from "drizzle-orm";

const app = new Hono()
  .use(
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
      exposeHeaders: ["set-auth-token"],
    })
  )
  .on(["GET", "POST"], "/api/auth/*", async (c) => {
    const { auth } = await import("./auth");
    return auth.handler(c.req.raw);
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
  .route("/affiliate", affiliateRouter);

export type AppType = typeof app;
export default app;
