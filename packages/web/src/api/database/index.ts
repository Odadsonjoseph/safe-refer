import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

// @neondatabase/serverless is ESM-native and works with Vercel's esbuild bundler.
// It uses the same postgres wire protocol as pg but without CJS dynamic requires.
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle(pool, { schema });
