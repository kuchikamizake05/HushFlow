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
  });
});
