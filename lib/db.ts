// Drizzle + Supabase Postgres connection.
//
// Use the Supabase connection pooler URL (Supavisor, transaction mode, port
// 6543) for serverless. That mode does not support prepared statements, so we
// pass prepare:false. The client is cached on globalThis in dev to avoid
// exhausting connections across hot reloads.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  // Do not throw at import time - let routes that hit the DB report a clean 500,
  // mirroring the old lib/mongodb behavior.
  console.warn("[db] DATABASE_URL not set - set it to the Supabase pooler connection string");
}

const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb._pgClient ?? postgres(url ?? "", { prepare: false, max: 1 });

if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;

export const db = drizzle(client, { schema });
