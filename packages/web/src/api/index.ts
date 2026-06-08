import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/auth";
import { listings } from "./routes/listings";
import { submissions } from "./routes/submissions";
import { usersRouter } from "./routes/users";
import { adminRouter } from "./routes/admin";
import { stripeRouter } from "./routes/stripe";
import { webhooksRouter } from "./routes/webhooks";

const app = new Hono()
  .use(
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
      exposeHeaders: ["set-auth-token"],
    })
  )
  // Auth — must be before basePath
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  // Webhooks — raw body needed before basePath
  .route("/webhooks", webhooksRouter)
  .basePath("api")
  // Health check — no auth middleware needed
  .get("/health", (c) => c.json({ status: "ok", ts: Date.now() }, 200))
  // All other routes go through auth middleware
  .use("*", authMiddleware)
  .route("/users", usersRouter)
  .route("/listings", listings)
  .route("/submissions", submissions)
  .route("/admin", adminRouter)
  .route("/stripe", stripeRouter);

export type AppType = typeof app;
export default app;
