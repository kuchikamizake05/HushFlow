export type ProofEvidence =
  | {
      evidenceStatus: "PARTIAL";
      reason: "FIXTURE_DATA" | "SIGNED_RESULT_UNAVAILABLE";
    }
  | { evidenceStatus: "VERIFIED" };

export function getProofPresentation(evidence: ProofEvidence) {
  return evidence.evidenceStatus === "VERIFIED"
    ? {
        label: "Verified evidence",
        detail: "Signed result bindings and source references are available.",
        claimable: false,
      }
    : {
        label: "Partial evidence",
        detail:
          evidence.reason === "FIXTURE_DATA"
            ? "Local fixture data cannot establish signed-result evidence."
            : "Signed-result evidence is unavailable.",
        claimable: false,
      };
}
