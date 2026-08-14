import type { DemoReadinessView } from "./readiness";

export function DemoReadiness({ readiness }: { readiness: DemoReadinessView }) {
  return (
    <div className="trade-card" style={{ maxWidth: "48rem" }}>
      <div className="card-header-bar">
        <div>
          <div className="card-label">SYSTEM HEALTH & PREFLIGHT</div>
          <h2 className="card-title">Flare Coston2 Readiness Matrix</h2>
        </div>
        <span className="tag-badge">
          Status: {readiness.state}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h3 style={{ fontSize: "0.8125rem", color: "var(--brand-amber)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)" }}>
            Public Prerequisites & Configuration
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.6rem" }}>
            {readiness.requirements.map((req) => (
              <div
                key={req.name}
                className="code-row"
                style={{ padding: "0.6rem 0.75rem" }}
              >
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  {req.name}
                </span>
                <span className={`tag-badge ${req.present ? "" : "badge-tag--danger"}`} style={{ fontSize: "0.6875rem" }}>
                  {req.present ? "OK" : "MISSING"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "0.8125rem", color: "var(--brand-amber)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)" }}>
            11-Step Controlled Action Sequence
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {readiness.actions.map((act) => (
              <div
                key={act.id}
                className="code-row"
                style={{ padding: "0.55rem 0.75rem" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--brand-amber)", fontSize: "0.8125rem" }}>
                    {act.id}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {act.description}
                  </span>
                </div>
                <span className="tag-badge" style={{ flexShrink: 0, fontSize: "0.6875rem" }}>
                  {act.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
          No wallet, signing key, or private credentials are required for public readiness verification.
        </p>
      </div>
    </div>
  );
}
