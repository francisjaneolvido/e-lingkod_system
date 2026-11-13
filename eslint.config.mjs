
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Default Next.js generated files and build folders.
  globalIgnores([
    ".next/**",
    ".next-b1-test/**",
    ".scratch/**",
    ".playwright-cli/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Node.js test files use module-mocking patterns that are
  // not subject to Next.js application module rules.
  {
    files: ["tests/**/*.test.mjs"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
]);

export default eslintConfig;
