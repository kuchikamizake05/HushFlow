"use client";

import { ShieldIcon, LockIcon, ZapIcon, ActivityIcon } from "../shell/icons";

const METRICS = [
  {
    icon: ShieldIcon,
    value: "0.00%",
    label: "Mempool Information Leakage",
    detail: "ECIES-secp256k1 client-side encryption ensures zero MEV or sandwich exposure.",
    accent: "var(--raycast-red)",
  },
  {
    icon: LockIcon,
    value: "100%",
    label: "Non-Custodial Escrow",
    detail: "Direct smart contract custody on Flare with instant 100% losing quote refunds.",
    accent: "#38bdf8",
  },
  {
    icon: ZapIcon,
    value: "11 / 11",
    label: "Coston2 On-Chain Steps",
    detail: "Complete multi-party settlement drill verified and indexed live on Coston2.",
    accent: "var(--brand-emerald)",
  },
  {
    icon: ActivityIcon,
    value: "52 / 52",
    label: "Formal Invariants Proven",
    detail: "Solvency, state monotonicity, and refund invariants mathematically validated.",
    accent: "#c084fc",
  },
];

export function TelemetryDeck() {
  return (
    <section id="features" className="horizon-metrics-section">
      <div className="horizon-metrics-container">
        <div className="horizon-metrics-grid">
          {METRICS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="horizon-metric-column">
                <div className="horizon-metric-top">
                  <span className="horizon-icon" style={{ color: item.accent }}>
                    <Icon width={16} height={16} />
                  </span>
                  <span className="horizon-val" style={{ color: "var(--text-pure)" }}>
                    {item.value}
                  </span>
                </div>
                <div className="horizon-label">{item.label}</div>
                <p className="horizon-detail">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
