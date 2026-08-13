import { describe, expect, it } from "vitest";

import {
  landingCopy,
  landingCtas,
} from "../../apps/web/src/marketing/landing-content.js";

describe("M4B judge-first landing", () => {
  it("routes both primary actions safely", () => {
    expect(landingCtas).toEqual([
      { label: "Start Private RFQ", href: "/trade" },
      { label: "Explore Proof", href: "/proof" },
    ]);
  });

  it("explains mechanics without exposing or inventing private values", () => {
    expect(landingCopy.join(" ")).toContain("Private FXRP execution");
    expect(landingCopy.join(" ")).toContain("Verifiable settlement");
    expect(landingCopy.join(" ")).not.toMatch(
      /2,400,000|minimum quote|winning quote/i,
    );
  });
});
