"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getWriteGuard, pendingWritePreflight } from "../writes/preflight";
import { XrpLogo, UsdtLogo, ShieldIcon, LockIcon, FlareLogo, CheckCircleIcon, RefreshCwIcon, ZapIcon } from "../shell/icons";

const ACTIVE_TARGET_RFQ = {
  id: "#RFQ-0042",
  seller: "0x89f...2d14",
  lot: "1.0 FXRP",
  collateralReq: "5.0 USDT0",
  deadline: "12m 40s remaining",
  status: "OPEN FOR QUOTES",
  oracleAnchor: "$2.485 FTSO V2",
};

const MAKER_POOL_FEED = [
  { id: "#RFQ-0041", lot: "2.5 FXRP", bid: "6.20 USDT0", status: "MATCHED & SETTLED", maker: "0xf3...8a2", time: "3m ago" },
  { id: "#RFQ-0040", lot: "5.0 FXRP", bid: "12.40 USDT0", status: "MATCHED & SETTLED", maker: "0x71...c19", time: "9m ago" },
  { id: "#RFQ-0039", lot: "0.5 FXRP", bid: "1.25 USDT0", status: "REFUNDED", maker: "0x4b...38e", time: "25m ago" },
];

export function LiquidityProvider() {
  const [bidAmount, setBidAmount] = useState("4.0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [submittedTx, setSubmittedTx] = useState<string | null>(null);

  const guard = getWriteGuard(pendingWritePreflight);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const isCoston2 = chainId === 114;

  const handleSubmitQuote = async (e: React.FormEvent) => {
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
    setSubmitStep("Encrypting quote with Flare TEE public key...");
    
    await new Promise((r) => setTimeout(r, 700));
    setSubmitStep("Escrowing 5.0 USDT0 collateral in HushFlowRfq.sol...");
    
    await new Promise((r) => setTimeout(r, 800));
    setSubmitStep("Broadcasting sealed quote payload to Coston2...");

    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setSubmitStep(null);
    setSubmittedTx("0xb6448e17d8706b7c1034aec7a5a3739144ae1a1072720a01e4441d7b762241bc");
  };

  return (
    <div className="pro-dashboard-container">
      <div className="pro-workspace-grid">
        {/* Left Column: Target RFQ Inspection & Pool Activity */}
        <div className="pro-chart-depth-col">
          {/* Target RFQ Hero Card */}
          <div className="liq-hero-inspect-card">
            <div className="liq-inspect-top">
              <div className="liq-inspect-badge">
                <FlareLogo width={16} height={16} />
                <span>ACTIVE RFQ TARGET</span>
              </div>
              <span className="rfq-status-badge open">{ACTIVE_TARGET_RFQ.status}</span>
            </div>

            <div className="liq-inspect-main">
              <div className="liq-inspect-title-row">
                <span className="liq-inspect-id">{ACTIVE_TARGET_RFQ.id}</span>
                <span className="liq-inspect-seller">Seller: {ACTIVE_TARGET_RFQ.seller}</span>
              </div>

              <div className="liq-inspect-grid">
                <div className="liq-metric-box">
                  <span className="liq-metric-label">OFFERED ASSET LOT</span>
                  <div className="liq-metric-val">
                    <XrpLogo width={18} height={18} />
                    <span>{ACTIVE_TARGET_RFQ.lot}</span>
                  </div>
                </div>

                <div className="liq-metric-box">
                  <span className="liq-metric-label">REQUIRED COLLATERAL</span>
                  <div className="liq-metric-val">
                    <UsdtLogo width={18} height={18} />
                    <span>{ACTIVE_TARGET_RFQ.collateralReq}</span>
                  </div>
                </div>

                <div className="liq-metric-box">
                  <span className="liq-metric-label">EXPIRATION WINDOW</span>
                  <div className="liq-metric-val" style={{ color: "var(--brand-amber)" }}>
                    {ACTIVE_TARGET_RFQ.deadline}
                  </div>
                </div>

                <div className="liq-metric-box">
                  <span className="liq-metric-label">ORACLE ANCHOR</span>
                  <div className="liq-metric-val" style={{ color: "var(--brand-emerald)" }}>
                    {ACTIVE_TARGET_RFQ.oracleAnchor}
                  </div>
                </div>
              </div>

              <div className="liq-sealed-notice">
                <LockIcon width={14} height={14} style={{ color: "var(--raycast-red)" }} />
                <span>
                  <strong>Seller's Reserve Price is Sealed.</strong> Decrypted only inside Flare TEE hardware during batch matching. Highest bidder over reserve wins lot at clearing price.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Maker Fulfillments Table */}
          <div className="pro-bottom-workspace">
            <div className="pro-tab-bar">
              <button className="pro-tab-btn active">
                <span>Recent Liquidity Fulfillments</span>
                <span className="tab-count-pill">{MAKER_POOL_FEED.length}</span>
              </button>
            </div>

            <div className="pro-tab-table-box">
              <table className="pro-data-table">
                <thead>
                  <tr>
                    <th>RFQ ID</th>
                    <th>LOT FILLED</th>
                    <th>WINNING BID</th>
                    <th>SETTLEMENT</th>
                    <th>MAKER</th>
                    <th>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {MAKER_POOL_FEED.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-pure)" }}>{row.id}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                          <XrpLogo width={13} height={13} />
                          {row.lot}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--brand-emerald)" }}>{row.bid}</td>
                      <td>
                        <span className={`rfq-status-badge ${row.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{row.maker}</td>
                      <td style={{ color: "var(--text-tertiary)" }}>{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sealed Quote Submission Card */}
        <div className="pro-execution-col">
          {/* Market Status Panel */}
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
                <span className="market-stat-label">Oracle Reference</span>
                <span className="market-stat-value highlight">$2.485 <span className="ticker-change text-success">+4.20%</span></span>
              </div>
              <div className="market-stat">
                <span className="market-stat-label">Your Wallet USDT0</span>
                <span className="market-stat-value">50.00 USDT0</span>
              </div>
              <div className="market-stat">
                <span className="market-stat-label">Collateral Refund</span>
                <span className="market-stat-value" style={{ color: "var(--brand-emerald)" }}>100% Guaranteed</span>
              </div>
              <div className="market-stat">
                <span className="market-stat-label">Mempool Exposure</span>
                <span className="market-stat-value text-secure">
                  <ShieldIcon width={12} height={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 3 }} />
                  Zero (ECIES)
                </span>
              </div>
            </div>
          </div>

          {/* Maker Quote Card */}
          <div className="pro-trade-card">
            <div className="pro-trade-card-header">
              <span className="pro-card-title">Submit Sealed Quote</span>
              <span className="privacy-pill-indicator">
                <LockIcon width={12} height={12} style={{ color: "var(--raycast-red)" }} />
                ECIES SEALED
              </span>
            </div>

            <form className="pro-trade-form" onSubmit={handleSubmitQuote}>
              {/* Field 1: Private Bid */}
              <div className="pro-input-group sealed-group">
                <div className="input-group-top">
                  <span className="input-label">Your Private Bid</span>
                  <span className="sealed-tag">Encrypted for TEE</span>
                </div>
                <div className="pro-input-control">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="4.0"
                    className="pro-number-input"
                  />
                  <div className="token-select-pill">
                    <UsdtLogo width={16} height={16} />
                    <span>USDT0</span>
                  </div>
                </div>
                <div className="input-quick-amounts">
                  <button type="button" onClick={() => setBidAmount("2.5")}>2.5</button>
                  <button type="button" onClick={() => setBidAmount("3.5")}>3.5</button>
                  <button type="button" onClick={() => setBidAmount("4.0")}>4.0</button>
                  <button type="button" onClick={() => setBidAmount("4.5")}>4.5</button>
                </div>
                <p className="field-hint-text">
                  Your bid is encrypted with the Flare TEE secp256k1 public key. Competing market makers cannot view your price in the mempool.
                </p>
              </div>

              {/* Field 2: Escrow Collateral */}
              <div className="pro-input-group">
                <div className="input-group-top">
                  <span className="input-label">Required Escrow Collateral</span>
                  <span className="input-balance">100% Refundable</span>
                </div>
                <div className="pro-input-control">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value="5.0"
                    className="pro-number-input"
                    style={{ opacity: 0.7, cursor: "not-allowed" }}
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
                  <span>Routing Protocol</span>
                  <span style={{ color: "var(--text-pure)" }}>HushFlow Flare FCC</span>
                </div>
                <div className="summary-row">
                  <span>Quote Privacy</span>
                  <span style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>Encrypted before FCC processing</span>
                </div>
                <div className="summary-row">
                  <span>Custody Contract</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>HushFlowRfq.sol (Coston2)</span>
                </div>
                <div className="summary-row">
                  <span>If Not Selected</span>
                  <span style={{ color: "var(--text-pure)" }}>100% Collateral Automatic Refund</span>
                </div>
              </div>

              {/* Action Button */}
              {!isConnected ? (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="pro-trade-submit-btn connect-mode"
                >
                  Connect Wallet (Submit quote after live preflight)
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
                  <span>Sign & Submit Encrypted Quote</span>
                  <span style={{ fontSize: "1rem" }}>→</span>
                </button>
              )}

              {submittedTx && (
                <div className="tx-success-banner">
                  <CheckCircleIcon width={16} height={16} style={{ color: "var(--brand-emerald)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-pure)" }}>Sealed Quote Submitted & Escrowed!</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      Coston2 Tx: <a href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-emerald)", textDecoration: "underline" }}>{submittedTx.slice(0, 14)}... ↗</a> · Sealed with Flare TEE Master Key
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

export { LiquidityProvider as QuoteForm };
