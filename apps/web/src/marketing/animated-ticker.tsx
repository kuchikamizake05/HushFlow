"use client";

const TICKER_ITEMS = [
  "⚡ Live on Flare Coston2 Testnet (Chain ID: 114)",
  "🔒 ECIES SECP256K1 Encrypted Inputs",
  "🛡️ Flare Confidential Compute (TEE Node v0.0.24)",
  "🏆 Zero Information Leakage · Mempool Front-Running Immune",
  "📦 Non-Custodial Smart Contract Escrow (HushFlowRfq.sol)",
  "💎 52 / 52 Invariant & Formal Tests Passing",
  "🚀 Settled RFQ #1: 1 FXRP Lot @ 4 USDT0",
];

export function AnimatedTicker() {
  return (
    <div className="ticker-wrap">
      <div className="ticker-inner">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>{item}</span>
            <span style={{ color: "var(--text-muted)" }}>•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
