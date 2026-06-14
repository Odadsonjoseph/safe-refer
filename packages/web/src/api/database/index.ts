import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// Lazy singleton — connection only established on first call to getDb()
let _db: DrizzleDB | null = null;

export function getDb(): DrizzleDB {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Typed proxy — all routes that import `db` directly still work
// Property access is forwarded to the lazy singleton
export const db: DrizzleDB = new Proxy({} as DrizzleDB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
  apply(_target, thisArg, args) {
    return Reflect.apply(getDb() as unknown as Function, thisArg, args);
  },
});
