import { Hono } from "hono";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
};

// Isolate health check first — no app module import
const healthApp = new Hono();
healthApp.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

// Lazy-load the full app only for non-health routes
let _fullHandler: ((req: Request) => Response | Promise<Response>) | null = null;

async function getFullHandler() {
  if (_fullHandler) return _fullHandler;
  const { default: app } = await import("../src/api/index");
  _fullHandler = handle(app);
  return _fullHandler;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Fast path: health check without loading heavy modules
  if (url.pathname === "/api/health") {
    return Response.json({ status: "ok", ts: Date.now() });
  }
  // Load full app lazily
  const h = await getFullHandler();
  return h(req);
}
