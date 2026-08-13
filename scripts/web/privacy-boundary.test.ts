import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const webSource = join(process.cwd(), "apps", "web", "src");
const privateForm = readFileSync(
  join(webSource, "rfq", "trade-form.tsx"),
  "utf8",
);
const readAdapter = readFileSync(join(webSource, "adapters", "m4a.ts"), "utf8");

describe("M4B privacy boundary", () => {
  it("keeps private input out of persistence, URLs, and telemetry", () => {
    expect(privateForm).not.toMatch(
      /localStorage|sessionStorage|indexedDB|document\.cookie|console\.|URLSearchParams/i,
    );
    expect(privateForm).toContain('useState("")');
  });

  it("keeps the read adapter body-free and coarse-error only", () => {
    expect(readAdapter).toContain('method: "GET"');
    expect(readAdapter).not.toMatch(/console\.|error\.message/i);
  });
});
