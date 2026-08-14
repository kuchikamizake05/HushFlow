"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COMMANDS = [
  {
    category: "Navigation",
    items: [
      { id: "home", title: "Go to Home / Overview", shortcut: "G H", href: "/" },
      { id: "trade", title: "Create Sealed RFQ (Trade)", shortcut: "G T", href: "/trade" },
      { id: "liquidity", title: "Submit Maker Quote (Liquidity)", shortcut: "G L", href: "/liquidity" },
      { id: "proof", title: "Cryptographic Proof Center", shortcut: "G P", href: "/proof" },
      { id: "portfolio", title: "Settlement Portfolio & Claims", shortcut: "G C", href: "/portfolio" },
      { id: "readiness", title: "Flare Coston2 Readiness Matrix", shortcut: "G S", href: "/demo/readiness" },
    ],
  },
  {
    category: "Smart Contracts & Explorer",
    items: [
      {
        id: "explorer-contract",
        title: "View HushFlowRfq on Coston2 Explorer",
        shortcut: "↵",
        external: "https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab",
      },
      {
        id: "explorer-tee",
        title: "View FlareTeeManager Diamond (#66273)",
        shortcut: "↵",
        external: "https://coston2-explorer.flare.network/address/0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE",
      },
      {
        id: "tunnel",
        title: "Check Live Flare TEE Public Endpoint",
        shortcut: "↵",
        external: "https://fcc.hushflow.dev/info",
      },
    ],
  },
];

export function RaycastCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filtered = COMMANDS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  if (!isOpen) return null;

  return (
    <div className="raycast-overlay" onClick={() => setIsOpen(false)}>
      <div className="raycast-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search input bar */}
        <div className="raycast-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search protocol..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="raycast-esc-pill">ESC</span>
        </div>

        {/* Command list */}
        <div className="raycast-results">
          {filtered.map((cat) => (
            <div key={cat.category} className="raycast-group">
              <div className="raycast-group-header">{cat.category}</div>
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  className="raycast-item"
                  onClick={() => {
                    setIsOpen(false);
                    if ("external" in item && item.external) {
                      window.open(item.external, "_blank");
                    } else if ("href" in item && item.href) {
                      router.push(item.href);
                    }
                  }}
                >
                  <span className="raycast-item-title">{item.title}</span>
                  <span className="raycast-item-kbd">{item.shortcut}</span>
                </button>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
              No commands found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="raycast-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Execute <kbd>↵</kbd></span>
          <span>HushFlow Raycast Command Bar</span>
        </div>
      </div>
    </div>
  );
}
