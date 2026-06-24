import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit (push/generate) runs outside Next, so load .env.local explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer the direct connection (port 5432) for schema push/generate; the
    // pooler is for the app's runtime queries.
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "",
  },
});
