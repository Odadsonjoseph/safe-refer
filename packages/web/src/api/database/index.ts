import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

// Lazy singleton — no connection is made until first call to getDb()
let _db: PostgresJsDatabase<typeof import("./schema")> | null = null;

export function getDb() {
  if (!_db) {
    // Only import and connect when actually needed
    const postgres = require("postgres");
    const { drizzle: drizzleInit } = require("drizzle-orm/postgres-js");
    const schemaModule = require("./schema");

    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    _db = drizzleInit(client, { schema: schemaModule });
  }
  return _db;
}

// Keep named `db` export as a lazy proxy so existing imports don't break
// Any property access or method call triggers the real connection
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
