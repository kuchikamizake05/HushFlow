import type { ProofEvidence } from "./presentation";
import { getProofPresentation } from "./presentation";

export function ProofCenter({ evidence }: { evidence: ProofEvidence }) {
  const presentation = getProofPresentation(evidence);
  return (
    <section className="proof-card" aria-labelledby="proof-evidence-title">
      <p className="eyebrow">EVIDENCE STATUS</p>
      <h2 id="proof-evidence-title">{presentation.label}</h2>
      <p>{presentation.detail}</p>
      <dl>
        <div>
          <dt>Public event</dt>
          <dd>Available only when a validated indexed record is connected.</dd>
        </div>
        <div>
          <dt>Signed result</dt>
          <dd>
            {evidence.evidenceStatus === "VERIFIED"
              ? "Bound and verified."
              : "Not asserted."}
          </dd>
        </div>
        <div>
          <dt>Claim authority</dt>
          <dd>
            Always requires a direct `claimable()` and `claimed()` contract
            read.
          </dd>
        </div>
      </dl>
    </section>
  );
}
