import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { productRoutes } from "../../apps/web/src/lib/routes.js";

describe("M4B web package contract", () => {
  it("publishes every approved product route", () => {
    expect(productRoutes).toEqual([
      "/",
      "/trade",
      "/market",
      "/liquidity",
      "/portfolio",
      "/proof",
      "/demo",
    ]);
    expect(existsSync("apps/web/app/rfq/[id]/page.tsx")).toBe(true);
  });
});
