// ESLint 9 flat config for Next 16. `next lint` was removed in Next 16, so the
// lint script calls the ESLint CLI directly. eslint-config-next 16 already ships
// a flat config array at the /core-web-vitals entry, so we spread it directly
// (wrapping it in FlatCompat double-wraps a flat config and crashes the
// validator with a circular-structure error).
import next from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "out/**", "coverage/**"] },
  ...next,
  {
    // Next 16 pulls in eslint-plugin-react-hooks v6, which adds these as errors.
    // The project never enforced them and the flagged patterns are intentional
    // (setState inside a data-fetching effect; Date.now() for a timestamp), so
    // keep them off to preserve the prior lint strictness. Revisit as a separate
    // cleanup pass rather than block the pipeline on a tooling upgrade.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
