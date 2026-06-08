import { Hono } from "hono";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
};

const app = new Hono();
app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

export default handle(app);
