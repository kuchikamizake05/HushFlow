import { describe, expect, it } from "vitest";

import { getProofPresentation } from "../../apps/web/src/proof/presentation.js";

describe("Proof Center presentation", () => {
  it("labels fixtures as partial evidence", () => {
    expect(
      getProofPresentation({
        evidenceStatus: "PARTIAL",
        reason: "FIXTURE_DATA",
      }),
    ).toMatchObject({ label: "Partial evidence", claimable: false });
  });

  it("only treats complete signed evidence as verified", () => {
    expect(getProofPresentation({ evidenceStatus: "VERIFIED" })).toMatchObject({
      label: "Verified evidence",
      claimable: false,
    });
  });

  it("does not present an unavailable signed result as verified", () => {
    expect(
      getProofPresentation({
        evidenceStatus: "PARTIAL",
        reason: "SIGNED_RESULT_UNAVAILABLE",
      }),
    ).toMatchObject({
      label: "Partial evidence",
      detail: "Signed-result evidence is unavailable.",
    });
  });
});
