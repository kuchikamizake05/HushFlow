import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getMigrationDirectory } from "../../services/indexer/src/runtime.js";

describe("indexer runtime paths", () => {
  it("resolves migrations independently from process working directory", () => {
    const original = process.cwd();
    try {
      process.chdir("services/indexer");
      const directory = getMigrationDirectory();
      expect(existsSync(directory)).toBe(true);
      expect(directory.replaceAll("\\", "/")).toMatch(
        /services\/indexer\/migrations$/,
      );
    } finally {
      process.chdir(original);
    }
  });
});
