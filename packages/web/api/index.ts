export const config = {
  runtime: "nodejs",
};

export default async function handler(req: Request) {
  const url = new URL(req.url);

  // Health check responds immediately — zero imports, zero DB
  if (url.pathname === "/api/health") {
    return new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Lazy-load everything else only when an actual API request comes in
  const { handle } = await import("hono/vercel");
  const { default: app } = await import("../src/api/index");
  return handle(app)(req);
}
