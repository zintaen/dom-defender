import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Vitest config for the unit gate (NFR-DOM-005 / BACKLOG L1-T5).
// The "@" alias mirrors tsconfig.json paths so tests import the same way the app does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(process.cwd()) },
  },
});
