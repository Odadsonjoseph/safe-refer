import { handle } from "hono/vercel";
import { Hono } from "hono";

export const config = {
  runtime: "nodejs",
};

let _app: Hono | null = null;

function getApp(): Hono {
  if (_app) return _app;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../src/api/index");
    _app = mod.default ?? mod;
    return _app!;
  } catch (err) {
    console.error("[safe-refer] Failed to load app module:", err);
    const fallback = new Hono();
    fallback.all("*", (c) => c.json({ error: "Module load failed", detail: String(err) }, 500));
    return fallback;
  }
}

export default function handler(req: Request) {
  const app = getApp();
  return handle(app)(req);
}
