import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// ESLint 9 flat config for Next 16. `next lint` was removed in Next 16, so the
// lint script now calls the ESLint CLI directly against this config. We reuse
// the same ruleset the project used before (next/core-web-vitals) via FlatCompat
// so behavior is unchanged.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "out/**", "coverage/**"] },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
