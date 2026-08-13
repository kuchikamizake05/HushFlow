import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("repository verification boundaries", () => {
  it("excludes local Claude worktrees from Git and formatting gates", async () => {
    const [gitignore, prettierignore] = await Promise.all([
      readFile(".gitignore", "utf8"),
      readFile(".prettierignore", "utf8"),
    ]);

    expect(gitignore.split(/\r?\n/)).toContain(".claude/");
    expect(prettierignore.split(/\r?\n/)).toContain(".claude/");
    expect(prettierignore.split(/\r?\n/)).toContain("**/.next/");
  });

  it("maps web linting to the web TypeScript project", async () => {
    const [eslintConfig, readContracts] = await Promise.all([
      readFile("eslint.config.mjs", "utf8"),
      readFile("apps/web/src/adapters/contracts.ts", "utf8"),
    ]);

    expect(eslintConfig).toContain('project: "./apps/web/tsconfig.json"');
    expect(readContracts).toContain('import type { z } from "zod";');
  });
});
