import { describe, expect, it } from "vitest";

import { derivePresentationState } from "../../apps/web/src/rfq/lifecycle.js";

describe("RFQ lifecycle presentation", () => {
  it("maps protocol states to clear, non-authorizing UI", () => {
    expect(derivePresentationState("OPEN")).toMatchObject({
      title: "Quoting window open",
      writeAllowed: false,
    });
    expect(derivePresentationState("SETTLED")).toMatchObject({
      title: "Settlement available",
      writeAllowed: false,
    });
  });

  it("never opens an indexed claim or deadline as an action authority", () => {
    for (const status of [
      "NO_VALID_QUOTE",
      "INVALID_RFQ",
      "CANCELLED",
      "TIMED_OUT",
    ] as const) {
      expect(derivePresentationState(status).writeAllowed).toBe(false);
    }
  });
});
