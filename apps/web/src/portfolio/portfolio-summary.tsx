"use client";

import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { FlareLogo, XrpLogo, UsdtLogo, CheckCircleIcon, ShieldIcon, LockIcon } from "../shell/icons";

interface PositionItem {
  id: string;
  role: "Seller" | "Provider";
  roleDetail?: string;
  action: string;
  outcome: string;
  status: "Settled" | "Refunded" | "Open";
  statusType: "success" | "warning" | "info";
  time: string;
  proofNote: string;
}

const DEMO_POSITIONS: PositionItem[] = [
  {
    id: "#RFQ-0042",
    role: "Seller",
    action: "Offered 1.0 FXRP",
    outcome: "Received 4.00 USDT0",
    status: "Settled",
    statusType: "success",
    time: "10m ago",
    proofNote: "Demo — no on-chain proof",
  },
  {
    id: "#RFQ-0038",
    role: "Provider",
    roleDetail: "Winning Bid",
    action: "Bid 4.00 USDT0 (5.0 Collateral)",
    outcome: "Received 1.0 FXRP + 1.0 USDT0 Change",
    status: "Settled",
    statusType: "success",
    time: "1h ago",
    proofNote: "Demo — no on-chain proof",
  },
  {
    id: "#RFQ-0035",
    role: "Provider",
    roleDetail: "Outbid",
    action: "Bid 3.50 USDT0 (5.0 Collateral)",
    outcome: "5.0 USDT0 Collateral 100% Refunded",
    status: "Refunded",
    statusType: "warning",
    time: "3h ago",
    proofNote: "Demo — no on-chain proof",
  },
];

export function PortfolioView() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="port-page-container">
      {/* Header */}
      <div className="port-page-header">
        <span className="port-eyebrow">
          <FlareLogo width={14} height={14} />
          PORTFOLIO · MY POSITIONS
        </span>
        <h1 className="port-title">Settlement History</h1>
        <p className="port-subtitle">
          View your private RFQ positions, escrowed collateral, and settlement claim history.
        </p>
      </div>

      {/* Balance Summary Cards */}
      <div className="port-stats-grid">
        <div className="port-stat-card">
          <div className="port-stat-top">
            <span className="port-stat-label">Locked Collateral</span>
            <span className="demo-label">Demo data</span>
          </div>
          <div className="port-stat-value text-amber">
            5.00 <span className="port-unit">USDT0</span>
          </div>
          <span className="port-stat-hint">Active in 1 open quote</span>
        </div>

        <div className="port-stat-card">
          <div className="port-stat-top">
            <span className="port-stat-label">Claimable Proceeds</span>
            <span className="demo-label">Demo data</span>
          </div>
          <div className="port-stat-value text-emerald">
            4.00 <span className="port-unit">USDT0</span>
          </div>
          <span className="port-stat-hint">Ready for on-chain withdrawal</span>
        </div>

        <div className="port-stat-card">
          <div className="port-stat-top">
            <span className="port-stat-label">Settled Assets</span>
            <span className="demo-label">Demo data</span>
          </div>
          <div className="port-stat-value">
            1.00 <span className="port-unit">FXRP</span>
          </div>
          <span className="port-stat-hint">Cumulative volume resolved</span>
        </div>
      </div>

      {/* Position List Card */}
      <div className="port-table-card">
        <div className="port-table-header">
          <div>
            <h2 className="port-card-title">Recent RFQ Positions</h2>
            <span className="port-card-subtitle">Showing historical settlements for connected wallet</span>
          </div>
          <span className="demo-label">Demo fixture</span>
        </div>

        <div className="port-positions-list">
          {DEMO_POSITIONS.map((pos) => (
            <div key={pos.id} className="port-position-row">
              <div className="port-pos-main">
                <div className="port-pos-id-role">
                  <span className="port-pos-id">{pos.id}</span>
                  <span className="port-pos-role-tag">
                    {pos.role} {pos.roleDetail && `(${pos.roleDetail})`}
                  </span>
                </div>
                <div className="port-pos-action">{pos.action}</div>
                <div className="port-pos-outcome">{pos.outcome}</div>
              </div>

              <div className="port-pos-side">
                <span className={`port-status-badge ${pos.statusType}`}>
                  <CheckCircleIcon width={12} height={12} />
                  {pos.status}
                </span>
                <span className="port-pos-time">{pos.time}</span>
                <span className="port-proof-note">{pos.proofNote}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Claim Action Bar */}
        <div className="port-actions-bar">
          {!isConnected ? (
            <button
              type="button"
              onClick={openConnectModal}
              className="pro-trade-submit-btn connect-mode"
            >
              Connect Wallet to View Live Positions
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="pro-trade-submit-btn disabled-mode"
              title="Demo mode — no live contract positions to claim"
            >
              Demo Mode — All Entitlements Settled
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="port-footer">
        <span className="status-dot" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
        <span>Coston2 Testnet · Demo data — connect wallet and live preflight for on-chain positions</span>
      </div>
    </div>
  );
}
