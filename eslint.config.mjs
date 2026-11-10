import { config } from "@remotion/eslint-config-flat";
import tseslint from "typescript-eslint";

const NODE = { console: "readonly", process: "readonly", URL: "readonly", Buffer: "readonly", setTimeout: "readonly", fetch: "readonly" };

export default [
  ...config,
  ...tseslint.config({
    files: ["src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { boolean: true } }],
    },
  }),
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: NODE },
  },
];
