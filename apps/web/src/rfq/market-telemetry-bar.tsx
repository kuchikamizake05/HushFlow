"use client";

import { XrpLogo, UsdtLogo, FlareLogo, ShieldIcon } from "../shell/icons";

export function MarketTelemetryBar() {
  return (
    <div className="trade-telemetry-bar">
      <div className="trade-telemetry-item pair-item">
        <div className="token-pair-icons">
          <span className="token-icon xrp"><XrpLogo width={16} height={16} /></span>
          <span className="token-icon usdt"><UsdtLogo width={16} height={16} /></span>
        </div>
        <div>
          <div className="pair-title">FXRP / USDT0</div>
          <div className="pair-oracle">
            <span className="oracle-dot" />
            <span>Flare FTSO V2 Live Feed</span>
          </div>
        </div>
      </div>

      <div className="trade-telemetry-item">
        <span className="telemetry-label">ORACLE PRICE</span>
        <span className="telemetry-val text-bold">$2.485 <span className="text-positive">+4.2%</span></span>
      </div>

      <div className="trade-telemetry-item">
        <span className="telemetry-label">PRIVACY GUARANTEE</span>
        <span className="telemetry-val text-secure">
          <ShieldIcon width={13} height={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
          0.00% Leakage
        </span>
      </div>

      <div className="trade-telemetry-item">
        <span className="telemetry-label">TEE HARDWARE</span>
        <span className="telemetry-val">Flare FCC AMD SEV</span>
      </div>

      <div className="trade-telemetry-item">
        <span className="telemetry-label">SETTLEMENT NETWORK</span>
        <span className="telemetry-val" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <FlareLogo width={14} height={14} />
          Coston2 (114)
        </span>
      </div>
    </div>
  );
}
