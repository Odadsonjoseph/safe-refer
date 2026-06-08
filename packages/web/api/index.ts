import { Hono } from "hono";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
};

const app = new Hono();
app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));
app.get("/api/*", (c) => c.json({ error: "not found" }, 404));
app.post("/api/*", (c) => c.json({ error: "not found" }, 404));

export default handle(app);
