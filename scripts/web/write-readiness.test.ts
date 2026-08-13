import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSource = join(process.cwd(), "apps", "web", "src");
const quoteForm = readFileSync(join(webSource, "liquidity", "quote-form.tsx"), "utf8");
const tradeForm = readFileSync(join(webSource, "rfq", "trade-form.tsx"), "utf8");

describe("M4B write readiness presentation", () => {
  it("shows the pending deployment reason in the seller form", () => {
    expect(tradeForm).toContain("DEPLOYMENT_PENDING");
    expect(tradeForm).toContain("Create RFQ after live preflight");
  });

  it("shows the pending deployment reason in the provider form", () => {
    expect(quoteForm).toContain("DEPLOYMENT_PENDING");
    expect(quoteForm).toContain("Submit quote after live preflight");
  });
});
