import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

// Using pg with ESM default import — works with Vercel's CJS bundling
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

export const db = drizzle(pool, { schema });
