import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getDefaultFixturePath,
  getMigrationDirectory,
} from "../../services/indexer/src/runtime.js";

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

  it("resolves the default fixture independently from package cwd", () => {
    const original = process.cwd();
    try {
      process.chdir("services/indexer");
      const path = getDefaultFixturePath();
      expect(existsSync(path)).toBe(true);
      expect(path.replaceAll("\\", "/")).toMatch(
        /packages\/protocol\/fixtures\/v1\/events\.json$/,
      );
    } finally {
      process.chdir(original);
    }
  });
});
