export const config = {
  runtime: "nodejs",
};

// Cached app reference — initialized once per Lambda instance
let _app: ((req: Request) => Promise<Response>) | null = null;

async function getApp() {
  if (!_app) {
    const { handle } = await import("hono/vercel");
    const { default: app } = await import("../src/api/index");
    _app = handle(app) as (req: Request) => Promise<Response>;
  }
  return _app;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);

  // Health check — zero deps, responds in <1ms
  if (url.pathname === "/api/health") {
    return new Response(
      JSON.stringify({ status: "ok", ts: Date.now(), env: !!process.env.DATABASE_URL }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // Everything else — lazy-load Hono app + all heavy deps
  try {
    const handle = await getApp();
    return handle(req);
  } catch (err: any) {
    console.error("[handler] Failed to init app:", err);
    return new Response(
      JSON.stringify({ error: "Server init failed", detail: err?.message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
