import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// postgres-js with serverless-safe settings
const client = postgres(connectionString, {
  ssl: "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10, // fail fast so we get real error, not timeout
  prepare: false, // required for transaction pooler (port 6543)
});

export const db = drizzle(client, { schema });
