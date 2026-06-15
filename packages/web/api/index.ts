import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/api/index";

export const config = { maxDuration: 30 };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const protocol = "https";
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string) || "localhost";
    const url = `${protocol}://${host}${req.url ?? "/"}`;

    // Read body
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    // Build Web Request
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const method = req.method ?? "GET";
    const webReq = new Request(url, {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : body,
    });

    // Fetch from Hono app
    const webRes = await app.fetch(webReq);

    // Write response
    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const buf = await webRes.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err: any) {
    console.error("Handler error:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Internal server error", message: err?.message }));
  }
}
