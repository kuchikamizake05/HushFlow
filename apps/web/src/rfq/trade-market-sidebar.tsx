"use client";

import { ShieldIcon, LockIcon, ZapIcon, CheckCircleIcon, FlareLogo } from "../shell/icons";

const RECENT_SETTLEMENTS = [
  { id: "#RFQ-09", lot: "1.0 FXRP", clearing: "4.00 USDT0", status: "Settled", time: "2m ago" },
  { id: "#RFQ-08", lot: "2.5 FXRP", clearing: "6.20 USDT0", status: "Settled", time: "14m ago" },
  { id: "#RFQ-07", lot: "0.5 FXRP", clearing: "1.25 USDT0", status: "Settled", time: "38m ago" },
];

export function TradeMarketSidebar() {
  return (
    <div className="trade-sidebar">
      {/* Privacy Guarantee Card */}
      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <div className="sidebar-badge">
            <ShieldIcon width={14} height={14} style={{ color: "var(--raycast-red)" }} />
            <span>ECIES BLIND RFQ</span>
          </div>
          <span className="sidebar-status-tag">HARDWARE SECURED</span>
        </div>

        <h3 className="sidebar-card-title">Zero Mempool Exposure</h3>
        <p className="sidebar-card-desc">
          Your minimum price is encrypted with Flare TEE’s secp256k1 public key directly inside your browser. Searchers, RPC nodes, and sandwich bots see only encrypted bytes.
        </p>

        <div className="sidebar-specs-list">
          <div className="sidebar-spec-row">
            <span className="spec-name">Reservation Privacy</span>
            <span className="spec-value text-success">Client-side Encrypted</span>
          </div>
          <div className="sidebar-spec-row">
            <span className="spec-name">Custody Contract</span>
            <span className="spec-value">HushFlowRfq.sol</span>
          </div>
          <div className="sidebar-spec-row">
            <span className="spec-name">Collateral Refund</span>
            <span className="spec-value text-success">100% Guaranteed</span>
          </div>
        </div>
      </div>

      {/* Recent On-Chain Settlements */}
      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <div className="sidebar-badge">
            <FlareLogo width={14} height={14} />
            <span>RECENT SETTLEMENTS</span>
          </div>
          <span className="sidebar-status-tag">COSTON2 LIVE</span>
        </div>

        <div className="settlements-mini-list">
          {RECENT_SETTLEMENTS.map((item) => (
            <div key={item.id} className="settlement-mini-row">
              <div>
                <div className="settlement-id">{item.id} · <span style={{ color: "var(--text-pure)", fontWeight: 600 }}>{item.lot}</span></div>
                <div className="settlement-sub">Clearing: {item.clearing} · {item.time}</div>
              </div>
              <span className="settlement-pill">
                <CheckCircleIcon width={11} height={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
