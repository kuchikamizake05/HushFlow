"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";

import type { DataProvenance } from "../adapters/contracts";
import { Navigation, landingNavItems, appNavItems } from "./navigation";
import { RaycastCommandPalette } from "./command-palette";
import { HeaderWalletButton } from "./wallet-button";
import { HushFlowLogo } from "./icons";

export function AppShell({
  children,
  provenance,
}: {
  children: ReactNode;
  provenance: DataProvenance | null;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const currentNavItems = isLanding ? landingNavItems : appNavItems;

  return (
    <div className="app-shell">
      <RaycastCommandPalette />

      {/* Floating Navbar */}
      <div className="raycast-header-wrapper">
        <header className="raycast-floating-navbar">
          {/* Left Brand with Official HushFlow Logo */}
          <Link className="raycast-brand-link" href="/" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="raycast-logo-symbol">
              <HushFlowLogo size={22} />
            </div>
            <span className="raycast-brand-name">HushFlow</span>
          </Link>

          {/* Desktop Center Links */}
          <Navigation />

          {/* Desktop Right Action Buttons */}
          <div className="raycast-right-actions">
            {isLanding ? (
              <Link href="/trade" className="raycast-cta-btn" style={{ textDecoration: "none" }}>
                <span>Launch App</span>
                <span style={{ fontSize: "0.875rem" }}>→</span>
              </Link>
            ) : (
              <HeaderWalletButton />
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="raycast-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open mobile menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </header>
      </div>

      {/* Raycast Mobile Menu Modal Overlay */}
      {isMobileMenuOpen && (
        <div className="raycast-mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="raycast-mobile-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header: Logo + Close Button */}
            <div className="raycast-mobile-header">
              <Link
                href="/"
                className="raycast-brand-link"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ flex: "none" }}
              >
                <div className="raycast-logo-symbol">
                  <HushFlowLogo size={22} />
                </div>
                <span className="raycast-brand-name" style={{ display: "inline" }}>HushFlow</span>
              </Link>

              <button
                type="button"
                className="raycast-mobile-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close mobile menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Navigation Links List */}
            <div className="raycast-mobile-nav-list">
              {currentNavItems.map((item) => {
                const isActive = !isLanding && pathname === item.href;
                return "external" in item && item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="raycast-mobile-nav-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`raycast-mobile-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>{item.label}</span>
                    {isActive && <span style={{ color: "var(--raycast-red)" }}>●</span>}
                  </Link>
                );
              })}
            </div>

            {/* Modal Divider */}
            <div className="raycast-mobile-divider" />

            {/* Modal Footer Action */}
            <div className="raycast-mobile-footer-action">
              {isLanding ? (
                <>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Settlement App
                  </span>
                  <Link
                    href="/trade"
                    className="raycast-cta-btn"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ textDecoration: "none" }}
                  >
                    <span>Launch App</span>
                    <span style={{ fontSize: "0.875rem" }}>→</span>
                  </Link>
                </>
              ) : (
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Account
                  </span>
                  <HeaderWalletButton />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="brand-group">
            <div className="raycast-logo-symbol" style={{ width: 24, height: 24 }}>
              <HushFlowLogo size={22} />
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
