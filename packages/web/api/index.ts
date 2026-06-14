import { handle } from "hono/vercel";
import { Hono } from "hono";

export const config = {
  runtime: "nodejs",
};

let appHandler: ReturnType<typeof handle>;
let initError: string | null = null;

async function initApp() {
  try {
    console.log("[INIT] Starting app initialization...");
    console.log("[INIT] DATABASE_URL prefix:", process.env.DATABASE_URL?.slice(0, 50));
    console.log("[INIT] BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
    console.log("[INIT] NODE_ENV:", process.env.NODE_ENV);
    
    console.log("[INIT] Importing app module...");
    const { default: app } = await import("../src/api/index");
    console.log("[INIT] App module imported successfully");
    
    appHandler = handle(app);
    console.log("[INIT] Handler created");
  } catch (err: any) {
    console.error("[FATAL] App init failed:", err?.message, err?.stack?.slice(0, 500));
    initError = err?.message || String(err);
    
    const errApp = new Hono();
    errApp.all("*", (c) => c.json({ error: "Server initialization failed", details: initError }, 500));
    appHandler = handle(errApp);
  }
}

// Initialize at module load time — but with a timeout guard
const initPromise = initApp();

export default async function handler(req: Request) {
  try {
    await Promise.race([
      initPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Init timeout after 25s")), 25000))
    ]);
  } catch (timeoutErr: any) {
    console.error("[FATAL] Init timed out:", timeoutErr.message);
    return new Response(JSON.stringify({ error: "Init timeout", details: timeoutErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
  
  return appHandler(req);
}
