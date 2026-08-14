"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { DataProvenance } from "../adapters/contracts";
import { Navigation } from "./navigation";
import { RaycastCommandPalette } from "./command-palette";
import { HeaderWalletButton } from "./wallet-button";
import { FlareLogo } from "./icons";

export function AppShell({
  children,
  provenance,
}: {
  children: ReactNode;
  provenance: DataProvenance | null;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className="app-shell">
      <RaycastCommandPalette />

      {/* Exact Raycast Floating Navbar */}
      <div className="raycast-header-wrapper">
        <header className="raycast-floating-navbar">
          {/* Left Brand with Red/Coral Raycast-style Icon */}
          <Link className="raycast-brand-link" href="/">
            <div className="raycast-logo-symbol">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                {/* Raycast stylized isometric chevron icon */}
                <path d="M4 16L12 8L16 12L8 20L4 16Z" fill="#ff4f40" />
                <path d="M12 4L20 12L16 16L8 8L12 4Z" fill="#ff6355" opacity="0.8" />
              </svg>
            </div>
            <span className="raycast-brand-name">HushFlow</span>
          </Link>

          {/* Center Links */}
          <Navigation />

          {/* Right Action Buttons */}
          <div className="raycast-right-actions">
            <HeaderWalletButton />
          </div>
        </header>
      </div>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="brand-group">
            <div className="raycast-logo-symbol" style={{ width: 22, height: 22 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 16L12 8L16 12L8 20L4 16Z" fill="#ff4f40" />
                <path d="M12 4L20 12L16 16L8 8L12 4Z" fill="#ff6355" opacity="0.8" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-pure)", fontSize: "0.875rem" }}>
              HushFlow Protocol
            </span>
          </div>
          <div className="footer-links">
            <Link href="/trade">Trade</Link>
            <Link href="/liquidity">Liquidity</Link>
            <Link href="/proof">Proof Center</Link>
            <a
              href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contract Explorer ↗
            </a>
            <a
              href="https://dev.flare.network/fcc"
              target="_blank"
              rel="noopener noreferrer"
            >
              Flare FCC Docs ↗
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Flare Coston2 Testnet (Chain ID 114) · Flare Confidential Compute (FCC) · ECIES Encrypted</span>
          <span>© 2026 HushFlow. Institutional Confidential Settlement.</span>
        </div>
      </footer>
    </div>
  );
}
