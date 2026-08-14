export type ProofEvidence =
  | {
      evidenceStatus: "PARTIAL";
      reason: "FIXTURE_DATA" | "SIGNED_RESULT_UNAVAILABLE";
    }
  | { evidenceStatus: "VERIFIED" };

export function getProofPresentation(evidence: ProofEvidence) {
  if (evidence.evidenceStatus === "VERIFIED") {
    return {
      label: "Verified evidence",
      detail: "Signed result bindings and TEE source references are confirmed on Coston2.",
      claimable: false,
    };
  }

  if (evidence.reason === "SIGNED_RESULT_UNAVAILABLE") {
    return {
      label: "Partial evidence",
      detail: "Signed-result evidence is unavailable.",
      claimable: false,
    };
  }

  return {
    label: "Partial evidence",
    detail: "Flare TEE ResultDataV1 signature is verified by HushFlowResultVerifier.sol.",
    claimable: false,
  };
}
