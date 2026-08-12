import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("M3 protocol ownership", () => {
  it.each([
    "scripts/coston2/live-plan.ts",
    "scripts/setup/check-coston2.ts",
    "services/fcc-extension/src/resolve-rfq.ts",
  ])("does not redefine shared protocol constants in %s", async (path) => {
    const source = await readFile(path, "utf8");

    expect(source).not.toMatch(/const COSTON2_CHAIN_ID\s*=/);
    expect(source).not.toMatch(/const MAX_PROVIDERS\s*=/);
  });
});
