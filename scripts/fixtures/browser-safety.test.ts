import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("M3 crypto browser boundary", () => {
  it.each(["envelope.ts", "metadata.ts", "ecies.ts"])(
    "%s imports no Node crypto or secret environment",
    async (file) => {
      const source = await readFile(`packages/crypto/src/${file}`, "utf8");
      expect(source).not.toMatch(/from ["']node:crypto["']/);
      expect(source).not.toMatch(/\bBuffer\b/);
      expect(source).not.toMatch(/process\.env/);
      expect(source).not.toMatch(
        /PRIVATE_KEY|INDEXER_DB_PASSWORD|AUTHORIZATION/i,
      );
    },
  );
});
