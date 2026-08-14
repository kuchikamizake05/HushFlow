import type { ReactNode } from "react";
import type { RfqStatus } from "./lifecycle";
import { derivePresentationState } from "./lifecycle";
import { MarketTelemetryBar } from "./market-telemetry-bar";
import { FlareLogo } from "../shell/icons";

export function RfqRouteShell({
  eyebrow,
  status = "OPEN",
  children,
}: {
  eyebrow: string;
  status?: RfqStatus;
  children?: ReactNode;
}) {
  const state = derivePresentationState(status);
  return (
    <div className="terminal-route-wrapper">
      {/* Top Header & Context */}
      <div className="route-header">
        <div className="announcement-chip">
          <FlareLogo width={14} height={14} />
          <span>{eyebrow} · FLARE TEE DARK POOL</span>
        </div>
        <h1 className="route-title">{state.title}</h1>
        <p className="route-subtitle">{state.description}</p>
      </div>

      {/* Live Market Telemetry Bar */}
      <MarketTelemetryBar />

      {/* Main Terminal Cockpit (2-Column) */}
      <div className="terminal-body-grid">{children}</div>

      <div className="preflight-footer-note" role="status">
        <span className="status-dot" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
        <span>
          Coston2 Testnet Live (Chain ID 114) · Zero mempool leakage via client-side ECIES encryption.
        </span>
      </div>
    </div>
  );
}
