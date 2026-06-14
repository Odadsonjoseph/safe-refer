import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
};

// Wrap in try/catch to surface real errors
let appHandler: ReturnType<typeof handle>;

try {
  const { default: app } = await import("../src/api/index");
  appHandler = handle(app);
} catch (err: any) {
  console.error("[FATAL] Failed to initialize app:", err?.message, err?.stack);
  // Return a handler that shows the real error
  const { Hono } = await import("hono");
  const errApp = new Hono();
  errApp.all("*", (c) => c.json({ error: "Server initialization failed", details: err?.message }, 500));
  appHandler = handle(errApp);
}

export default async function handler(req: Request) {
  return appHandler(req);
}
