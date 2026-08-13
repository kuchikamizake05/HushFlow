import Link from "next/link";
import type { ReactNode } from "react";

import type { DataProvenance } from "../adapters/contracts";
import { DataStatusBanner } from "./data-status-banner";
import { Navigation } from "./navigation";

export function AppShell({
  children,
  provenance,
}: {
  children: ReactNode;
  provenance: DataProvenance;
}) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="wordmark" href="/">
          HushFlow
        </Link>
        <Navigation />
        <span className="wallet-state">Wallet unavailable</span>
      </header>
      <DataStatusBanner provenance={provenance} />
      <main>{children}</main>
      <footer className="site-footer">
        <span>Coston2 · FCC · encrypted inputs · onchain settlement</span>
      </footer>
    </div>
  );
}
