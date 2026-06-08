import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// postgres-js handles Supabase pooler connections better than pg
// max: 1 is important for serverless (Vercel) to avoid connection exhaustion
const client = postgres(connectionString, {
  ssl: "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false, // required for transaction pooler (port 6543)
});

export const db = drizzle(client, { schema });
