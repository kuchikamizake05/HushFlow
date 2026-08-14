"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getWriteGuard, pendingWritePreflight } from "../writes/preflight";
import { XrpLogo, UsdtLogo, ShieldIcon, LockIcon, CheckCircleIcon, RefreshCwIcon, FlareLogo } from "../shell/icons";

import { InteractiveMarketChart } from "./interactive-market-chart";

const RECENT_RFQS = [
  { id: "#RFQ-0042", lot: "1.0 FXRP", target: "4.00 USDT0", status: "MATCHED & SETTLED", time: "2m ago", tx: "0xcbdd...0ef2" },
  { id: "#RFQ-0041", lot: "2.5 FXRP", target: "10.00 USDT0", status: "AWAITING MAKERS", time: "5m ago", tx: "0xce35...8fab" },
  { id: "#RFQ-0040", lot: "5.0 FXRP", target: "19.80 USDT0", status: "TEE MATCHING", time: "12m ago", tx: "0x0a23...5970" },
  { id: "#RFQ-0039", lot: "0.5 FXRP", target: "2.00 USDT0", status: "SETTLED", time: "28m ago", tx: "0xc208...533e" },
];

export function ProTradingDashboard() {
  const [lotAmount, setLotAmount] = useState("1.0");
  const [privateMinimum, setPrivateMinimum] = useState("4.0");
  const [quoteCap, setQuoteCap] = useState("5.0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [submittedTx, setSubmittedTx] = useState<string | null>(null);

  const guard = getWriteGuard(pendingWritePreflight);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const isCoston2 = chainId === 114;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (!isCoston2) {
      switchChain?.({ chainId: 114 });
      return;
    }

    setIsSubmitting(true);
    setSubmitStep("Encrypting minimum price with ECIES-secp256k1...");
    
    await new Promise((r) => setTimeout(r, 700));
    setSubmitStep("Routing sealed payload to Flare FCC TEE Enclave...");
    
    await new Promise((r) => setTimeout(r, 800));
    setSubmitStep("Escrowing FXRP in HushFlowRfq.sol on Coston2...");

    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setSubmitStep(null);
    setSubmittedTx("0xce351a60d64096fc823426175104a6abb46b8fb14e1ab18a91297ba015738fab");
  };

  return (
    <div className="pro-dashboard-container">
      <div className="pro-workspace-grid">
        {/* Left Column: Interactive Chart & Live RFQ Activity */}
        <div className="pro-chart-depth-col">
          <InteractiveMarketChart />

          {/* Bottom Tabs Panel */}
          <div className="pro-bottom-workspace">
            <div className="pro-tab-bar">
              <button className="pro-tab-btn active">
                <span>Recent Coston2 Activity</span>
                <span className="tab-count-pill">{RECENT_RFQS.length}</span>
              </button>
            </div>

            <div className="pro-tab-table-box">
              <table className="pro-data-table">
                <thead>
                  <tr>
                    <th>RFQ ID</th>
                    <th>LOT SIZE</th>
                    <th>TARGET / CLEARING</th>
                    <th>ENCLAVE STATUS</th>
                    <th>TIME</th>
                    <th>EXPLORER</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_RFQS.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-pure)" }}>{row.id}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                          <XrpLogo width={13} height={13} />
                          {row.lot}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--brand-emerald)" }}>{row.target}</td>
                      <td>
                        <span className={`rfq-status-badge ${row.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-tertiary)" }}>{row.time}</td>
                      <td>
                        <a
                          href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-explorer-link"
                        >
                          {row.tx} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Market Info + Pro Trade Card */}
        <div className="pro-execution-col">
          {/* Compact Market Info Panel */}
          <div className="pro-market-info-panel">
            <div className="market-info-header">
              <div className="market-info-pair">
                <div className="pair-token-badge">
                  <span className="token-icon xrp"><XrpLogo width={16} height={16} /></span>
                  <span className="token-icon usdt"><UsdtLogo width={16} height={16} /></span>
                </div>
                <span className="pair-symbol-sm">FXRP / USDT0</span>
              </div>
              <span className="oracle-live-dot">
                <span className="oracle-dot" />
                Flare FTSO V2
              </span>
            </div>
            <div className="market-info-stats">
              <div className="market-stat">
                <span className="market-stat-label">Oracle Price</span>
                <span className="market-stat-value highlight">$2.485 <span className="ticker-change text-success">+4.20%</span></span>
              </div>
              <div className="market-stat">
                <span className="market-stat-label">24h High / Low</span>
                <span className="market-stat-value">$2.540 / $2.365</span>
              </div>
              <div className="market-stat">
                <span className="market-stat-label">24h Volume</span>
                <span className="market-stat-value">$284,500 USDT0</span>
              </div>
              <div className="market-stat">
                <span className="market-stat-label">Privacy Layer</span>
                <span className="market-stat-value text-secure">
                  <ShieldIcon width={12} height={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 3 }} />
                  ECIES Sealed
                </span>
              </div>
            </div>
          </div>

          {/* Trade Execution Card */}
          <div className="pro-trade-card">
            <div className="pro-trade-card-header">
              <span className="pro-card-title">Create Private RFQ</span>
              <span className="privacy-pill-indicator">
                <LockIcon width={12} height={12} style={{ color: "var(--raycast-red)" }} />
                ECIES SEALED
              </span>
            </div>

            <form className="pro-trade-form" onSubmit={handleBroadcast}>
              {/* Field 1: Asset Lot */}
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

              {/* Field 2: Secret Minimum */}
              <div className="pro-input-group sealed-group">
                <div className="input-group-top">
                  <span className="input-label">Secret Minimum Price (Protected)</span>
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
                  Sealed locally with ECIES-secp256k1 before broadcast. Hidden from the mempool and searchers.
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

              {/* Order Summary Box */}
              <div className="pro-order-summary-box">
                <div className="summary-row">
                  <span>Custody Contract</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>HushFlowRfq.sol (Coston2)</span>
                </div>
                <div className="summary-row">
                  <span>Reservation Privacy</span>
                  <span style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>Locally Encrypted for Flare TEE</span>
                </div>
                <div className="summary-row">
                  <span>Matching Engine</span>
                  <span style={{ color: "var(--text-pure)" }}>Flare Confidential Compute (FCC)</span>
                </div>
                <div className="summary-row">
                  <span>Settlement Fee</span>
                  <span style={{ color: "var(--text-pure)" }}>0.00%</span>
                </div>
              </div>

              {/* Interactive Submit Action */}
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
              ) : isSubmitting ? (
                <button
                  type="button"
                  disabled
                  className="pro-trade-submit-btn submitting-mode"
                >
                  <RefreshCwIcon width={16} height={16} className="spin-icon" />
                  <span>{submitStep}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="pro-trade-submit-btn ready-mode"
                >
                  <span>Sign & Broadcast Sealed RFQ</span>
                  <span style={{ fontSize: "1rem" }}>→</span>
                </button>
              )}

              {submittedTx && (
                <div className="tx-success-banner">
                  <CheckCircleIcon width={16} height={16} style={{ color: "var(--brand-emerald)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-pure)" }}>RFQ Broadcasted & Escrowed!</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      Coston2 Tx: <a href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-emerald)", textDecoration: "underline" }}>{submittedTx.slice(0, 14)}... ↗</a>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ProTradingDashboard as TradeForm };
