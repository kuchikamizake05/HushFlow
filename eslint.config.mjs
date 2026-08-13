import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/.tools/**",
      "**/artifacts/**",
      "**/cache/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/out/**",
      "contracts/**",
      "docs/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.scripts.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  {
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./apps/web/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["services/indexer/src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./services/indexer/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
