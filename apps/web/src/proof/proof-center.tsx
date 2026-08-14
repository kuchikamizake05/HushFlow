import type { ProofEvidence } from "./presentation";
import { getProofPresentation } from "./presentation";

const LIVE_PROOFS = [
  { label: "TEE Extension ID", value: "66273", highlight: true },
  { label: "Contract Address", value: "0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab", isLink: true },
  { label: "Action ID", value: "0xdc2262d08a5bb850868f760e1d51f28b49f485aa5c0c9aa1ae9bdfef33b006c9" },
  { label: "ECDSA Signature", value: "0x89dc82a0b1cc428fe0cf9e584f932ea4bbba437f..." },
  { label: "Settlement Status", value: "Settled on-chain (11/11 Steps)", isSuccess: true },
];

export function ProofCenter({ evidence }: { evidence: ProofEvidence }) {
  const presentation = getProofPresentation(evidence);

  return (
    <div className="trade-card" style={{ maxWidth: "42rem" }}>
      <div className="card-header-bar">
        <div>
          <div className="card-label">CRYPTOGRAPHIC AUDIT TRAIL</div>
          <h2 className="card-title">{presentation.label}</h2>
        </div>
        <span className="tag-badge">COSTON2 VERIFIED</span>
      </div>

      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
        {presentation.detail}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {LIVE_PROOFS.map((p, idx) => (
          <div key={idx} className="code-row">
            <span className="code-key">{p.label}</span>
            {p.isLink ? (
              <a
                href={`https://coston2-explorer.flare.network/address/${p.value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-mono"
                style={{ color: "var(--brand-amber)" }}
              >
                {p.value.slice(0, 10)}...{p.value.slice(-8)} ↗
              </a>
            ) : (
              <span className={p.isSuccess ? "code-val-success" : p.highlight ? "code-val-accent" : "code-val"}>
                {p.value}
              </span>
            )}
          </div>
        ))}
      </div>

      <a
        href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"
        target="_blank"
        rel="noopener noreferrer"
        className="action-btn action-btn-secondary"
        style={{ width: "100%", justifyContent: "center" }}
      >
        View Full Contract on Coston2 Explorer ↗
      </a>
    </div>
  );
}
