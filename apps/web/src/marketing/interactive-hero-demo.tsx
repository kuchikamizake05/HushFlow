"use client";

import { useState, useEffect } from "react";
import { LockIcon, UserIcon, TrophyIcon, ZapIcon, ShieldIcon, XrpLogo, UsdtLogo } from "../shell/icons";

const STAGES = [
  {
    id: 1,
    tag: "Step 1 · Request",
    title: "1. Seller Deposits & Sets Hidden Minimum",
    badge: "Seller Escrow",
    desc: "The seller deposits 1 FXRP into smart contract escrow. Their target minimum price is encrypted with Flare TEE — invisible to searchers, sandwich bots, and competitors.",
    visual: {
      deposit: "1.00 FXRP",
      depositLabel: "Asset Deposited to Flare Custody",
      minPrice: "Encrypted & Hidden",
      minPriceSub: "Decrypted only inside TEE hardware",
      status: "Awaiting Market Makers",
      statusType: "pending",
    },
  },
  {
    id: 2,
    tag: "Step 2 · Blind Bidding",
    title: "2. Market Makers Submit Blind Sealed Quotes",
    badge: "Mempool Sealed",
    desc: "Market makers compete by submitting sealed collateralized bids. Competitors cannot spy on other bids in the mempool, completely preventing front-running and copy-trading.",
    visual: {
      makerA: "Maker A Quote: Sealed",
      makerASub: "Collateral: 5.00 USDT0 Locked",
      makerB: "Maker B Quote: Sealed",
      makerBSub: "Collateral: 5.00 USDT0 Locked",
      leakage: "0.00% Information Leakage (Zero Mempool Exposure)",
      statusType: "active",
    },
  },
  {
    id: 3,
    tag: "Step 3 · TEE Matching",
    title: "3. Flare TEE Decrypts & Picks Best Price",
    badge: "Private Computation",
    desc: "The confidential hardware enclave decrypts all quotes internally. It selects Maker B (4.00 USDT0) as the winning bid and cryptographically signs the verified settlement.",
    visual: {
      winner: "Maker B Winner: 4.00 USDT0",
      winnerSub: "Highest bid satisfying seller target",
      attestation: "Verified by Flare TEE Node",
      attestationSub: "ECDSA Secp256k1 Attestation Signed",
      statusType: "success",
    },
  },
  {
    id: 4,
    tag: "Step 4 · Settlement",
    title: "4. Instant Payout & 100% Collateral Refunds",
    badge: "Settled on Coston2",
    desc: "The smart contract executes atomically on Flare Coston2. The seller gets their payment, the winner gets their tokens, and losing bidders get 100% of their collateral refunded immediately.",
    visual: {
      payout1: "Seller Payout: +4.00 USDT0",
      payout2: "Winner Payout: +1.00 FXRP",
      refund: "Maker A: +5.00 USDT0 Refunded",
      statusType: "complete",
    },
  },
];

export function InteractiveHeroDemo() {
  const [activeStage, setActiveStage] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev % 4) + 1);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const currentStage = STAGES[activeStage - 1] ?? STAGES[0]!;

  return (
    <div className="demo-visual-card">
      {/* Top Interactive Stepper */}
      <div className="demo-stepper">
        {STAGES.map((s) => {
          const isActive = activeStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className={`demo-step-tab ${isActive ? "active" : ""}`}
            >
              <span className="step-num">{s.id}</span>
              <span className="step-text">{s.tag.split("·")[1]?.trim() ?? s.tag}</span>
              {isActive && <div className="step-progress-bar" />}
            </button>
          );
        })}
      </div>

      {/* Main Card Body */}
      <div className="demo-card-body">
        {/* Left Explanation Column */}
        <div className="demo-info-col">
          <div className="demo-tag-row">
            <span className="demo-badge">{currentStage.badge}</span>
            <span className="demo-step-indicator">Step {activeStage} of 4</span>
          </div>

          <h3 className="demo-title">{currentStage.title}</h3>
          <p className="demo-desc">{currentStage.desc}</p>
        </div>

        {/* Right Visual Flow Column */}
        <div className="demo-graphic-col">
          {activeStage === 1 && (
            <div className="interactive-flow-box">
              <div className="flow-row">
                <div className="flow-icon-box" style={{ background: "rgba(255, 255, 255, 0.08)" }}>
                  <XrpLogo width={18} height={18} />
                </div>
                <div className="flow-content">
                  <div className="flow-title">{currentStage.visual.deposit}</div>
                  <div className="flow-sub">{currentStage.visual.depositLabel}</div>
                </div>
                <span className="flow-status-pill success">Locked in Escrow</span>
              </div>

              <div className="flow-row">
                <div className="flow-icon-box">
                  <LockIcon width={16} height={16} style={{ color: "var(--raycast-red)" }} />
                </div>
                <div className="flow-content">
                  <div className="flow-title">{currentStage.visual.minPrice}</div>
                  <div className="flow-sub">{currentStage.visual.minPriceSub}</div>
                </div>
                <span className="flow-status-pill secure">Zero Leakage</span>
              </div>
            </div>
          )}

          {activeStage === 2 && (
            <div className="interactive-flow-box">
              <div className="flow-row">
                <div className="flow-icon-box">
                  <UserIcon width={16} height={16} />
                </div>
                <div className="flow-content">
                  <div className="flow-title">{currentStage.visual.makerA}</div>
                  <div className="flow-sub">{currentStage.visual.makerASub}</div>
                </div>
                <span className="flow-status-pill sealed">Sealed Bid</span>
              </div>

              <div className="flow-row">
                <div className="flow-icon-box">
                  <UserIcon width={16} height={16} />
                </div>
                <div className="flow-content">
                  <div className="flow-title">{currentStage.visual.makerB}</div>
                  <div className="flow-sub">{currentStage.visual.makerBSub}</div>
                </div>
                <span className="flow-status-pill sealed">Sealed Bid</span>
              </div>

              <div className="flow-mempool-note">
                <ShieldIcon width={13} height={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4, color: "var(--raycast-red)" }} />
                {currentStage.visual.leakage}
              </div>
            </div>
          )}

          {activeStage === 3 && (
            <div className="interactive-flow-box">
              <div className="flow-row winner-row">
                <div className="flow-icon-box trophy">
                  <TrophyIcon width={16} height={16} style={{ color: "#f59e0b" }} />
                </div>
                <div className="flow-content">
                  <div className="flow-title highlight">{currentStage.visual.winner}</div>
                  <div className="flow-sub">{currentStage.visual.winnerSub}</div>
                </div>
                <span className="flow-status-pill winner">Best Quote</span>
              </div>

              <div className="flow-row">
                <div className="flow-icon-box">
                  <ZapIcon width={16} height={16} style={{ color: "var(--brand-emerald)" }} />
                </div>
                <div className="flow-content">
                  <div className="flow-title">{currentStage.visual.attestation}</div>
                  <div className="flow-sub">{currentStage.visual.attestationSub}</div>
                </div>
                <span className="flow-status-pill verified">Signed & Valid</span>
              </div>
            </div>
          )}

          {activeStage === 4 && (
            <div className="interactive-flow-box">
              <div className="flow-row">
                <div className="flow-icon-box" style={{ background: "transparent" }}>
                  <UsdtLogo width={22} height={22} />
                </div>
                <div className="flow-content">
                  <div className="flow-title text-success">{currentStage.visual.payout1}</div>
                  <div className="flow-sub">Transferred to Seller Address</div>
                </div>
                <span className="flow-status-pill success">Settled</span>
              </div>

              <div className="flow-row">
                <div className="flow-icon-box" style={{ background: "rgba(255, 255, 255, 0.08)" }}>
                  <XrpLogo width={18} height={18} />
                </div>
                <div className="flow-content">
                  <div className="flow-title text-success">{currentStage.visual.payout2}</div>
                  <div className="flow-sub">Transferred to Winner (Maker B)</div>
                </div>
                <span className="flow-status-pill success">Delivered</span>
              </div>

              <div className="flow-row">
                <div className="flow-icon-box" style={{ background: "transparent" }}>
                  <UsdtLogo width={22} height={22} />
                </div>
                <div className="flow-content">
                  <div className="flow-title">{currentStage.visual.refund}</div>
                  <div className="flow-sub">Non-winning maker collateral returned</div>
                </div>
                <span className="flow-status-pill refund-pill">100% Refund</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
