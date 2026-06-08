import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
};

// Wrap in try-catch to surface real errors instead of generic FUNCTION_INVOCATION_FAILED
let appHandler: ReturnType<typeof handle>;

try {
  // Dynamic import to get real error message if something fails at init
  const { default: app } = await import("../src/api/index");
  appHandler = handle(app);
} catch (err) {
  console.error("[SAFE-REFER INIT ERROR]", err);
  appHandler = (_req: Request) =>
    new Response(
      JSON.stringify({ error: "Function init failed", detail: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
}

export default appHandler;
