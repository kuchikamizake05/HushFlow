"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getWriteGuard, pendingWritePreflight } from "../writes/preflight";
import { XrpLogo, UsdtLogo, ShieldIcon, LockIcon, FlareLogo } from "../shell/icons";

const LIFECYCLE_STEPS = [
  { label: "Open", active: true },
  { label: "Quotes Sealed", active: false },
  { label: "FCC Resolves", active: false },
  { label: "Settlement", active: false },
];

export function TradeForm() {
  const [lotAmount, setLotAmount] = useState("1.0");
  const [privateMinimum, setPrivateMinimum] = useState("4.0");
  const [quoteCap, setQuoteCap] = useState("5.0");
  const [submittedTx, setSubmittedTx] = useState("");

  const guard = getWriteGuard(pendingWritePreflight);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const isCoston2 = chainId === 114;

  return (
    <div className="liq-page-container">
      {/* Page Header */}
      <div className="liq-page-header">
        <span className="liq-eyebrow">
          <FlareLogo width={14} height={14} />
          SELLER · CREATE PRIVATE RFQ
        </span>
        <h1 className="liq-title">Initiate Sealed Trade</h1>
        <p className="liq-subtitle">
          Define your asset lot and sealed reservation price. Your minimum price is encrypted locally before Flare FCC processing.
        </p>
      </div>

      {/* RFQ Lifecycle Timeline */}
      <div className="liq-timeline">
        {LIFECYCLE_STEPS.map((step, idx) => (
          <div key={step.label} className={`liq-timeline-step ${step.active ? "active" : ""}`}>
            <div className="liq-timeline-dot" />
            {idx < LIFECYCLE_STEPS.length - 1 && <div className="liq-timeline-line" />}
            <span className="liq-timeline-label">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Main Trade Card */}
      <div className="liq-form-card">
        <form className="pro-trade-form" onSubmit={(e) => e.preventDefault()}>
          {/* Field 1: Asset Lot (Public) */}
          <div className="pro-input-group">
            <div className="input-group-top">
              <span className="input-label">Offer Asset Lot (Public Custody)</span>
              <span className="input-balance">Balance: 12.50 FXRP</span>
            </div>
            <div className="pro-input-control">
              <input
                type="text"
                inputMode="decimal"
                value={lotAmount}
                onChange={(e) => setLotAmount(e.target.value)}
                placeholder="1.0"
                className="pro-number-input"
              />
              <div className="token-select-pill">
                <XrpLogo width={16} height={16} />
                <span>FXRP</span>
              </div>
            </div>
            <div className="input-quick-amounts">
              <button type="button" onClick={() => setLotAmount("1.0")}>1.0</button>
              <button type="button" onClick={() => setLotAmount("2.5")}>2.5</button>
              <button type="button" onClick={() => setLotAmount("5.0")}>5.0</button>
              <button type="button" onClick={() => setLotAmount("12.5")}>MAX</button>
            </div>
          </div>

          {/* Field 2: Secret Minimum (Protected) */}
          <div className="pro-input-group sealed-group">
            <div className="input-group-top">
              <span className="input-label">Secret Reservation Minimum (Protected)</span>
              <span className="sealed-tag">Encrypted for TEE</span>
            </div>
            <div className="pro-input-control">
              <input
                type="text"
                inputMode="decimal"
                value={privateMinimum}
                onChange={(e) => setPrivateMinimum(e.target.value)}
                placeholder="4.0"
                className="pro-number-input"
              />
              <div className="token-select-pill">
                <UsdtLogo width={16} height={16} />
                <span>USDT0</span>
              </div>
            </div>
            <p className="field-hint-text">
              Encrypted client-side with ECIES-secp256k1 before FCC processing. Hidden from the mempool, searchers, and competing makers.
            </p>
          </div>

          {/* Field 3: Collateral Cap */}
          <div className="pro-input-group">
            <div className="input-group-top">
              <span className="input-label">Maximum Maker Collateral Cap</span>
              <span className="input-balance">100% Refundable</span>
            </div>
            <div className="pro-input-control">
              <input
                type="text"
                inputMode="decimal"
                value={quoteCap}
                onChange={(e) => setQuoteCap(e.target.value)}
                placeholder="5.0"
                className="pro-number-input"
              />
              <div className="token-select-pill">
                <UsdtLogo width={16} height={16} />
                <span>USDT0</span>
              </div>
            </div>
          </div>

          {/* Review Summary */}
          <div className="pro-order-summary-box">
            <div className="summary-row">
              <span>Custody Contract</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>HushFlowRfq.sol (Coston2)</span>
            </div>
            <div className="summary-row">
              <span>Reservation Privacy</span>
              <span style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>Locally Encrypted (TEE Sealed)</span>
            </div>
            <div className="summary-row">
              <span>Matching Engine</span>
              <span style={{ color: "var(--text-pure)" }}>Flare Confidential Compute (FCC)</span>
            </div>
            <div className="summary-row">
              <span>Protocol Settlement Fee</span>
              <span style={{ color: "var(--text-pure)" }}>0.00%</span>
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <button
              type="button"
              onClick={openConnectModal}
              className="pro-trade-submit-btn connect-mode"
            >
              Connect Wallet (Create RFQ after live preflight)
            </button>
          ) : !isCoston2 ? (
            <button
              type="button"
              onClick={() => switchChain?.({ chainId: 114 })}
              className="pro-trade-submit-btn switch-mode"
            >
              Switch Network to Flare Coston2
            </button>
          ) : (
            <button
              type="button"
              disabled={!guard.enabled}
              className="pro-trade-submit-btn disabled-mode"
              title="Demo mode — contract deployment pending"
            >
              {guard.enabled ? "Sign & Create RFQ on Coston2" : "Demo Mode — Contract Deployment Pending"}
            </button>
          )}

          <p className="demo-footer-note">
            Demo mode — no transactions are sent to Coston2
          </p>
        </form>
      </div>

      {/* Footer */}
      <div className="liq-footer">
        <span className="status-dot" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
        <span>Coston2 Testnet · Demo mode — live preflight required for on-chain broadcast</span>
      </div>
    </div>
  );
}
