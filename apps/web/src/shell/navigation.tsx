"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const landingNavItems = [
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Security", href: "#security" },
  { label: "Ledger", href: "#ledger" },
  { label: "Docs ↗", href: "https://dev.flare.network/fcc", external: true },
];

const appNavItems = [
  { label: "Trade", href: "/trade" },
  { label: "Liquidity", href: "/liquidity" },
  { label: "Portfolio", href: "/portfolio" },
];

function getSafePathname(): string | null {
  try {
    return usePathname();
  } catch {
    return null;
  }
}

export function Navigation() {
  const pathname = getSafePathname();
  const isLanding = pathname === "/";
  const items = isLanding ? landingNavItems : appNavItems;

  return (
    <nav aria-label="Primary navigation" className="raycast-nav-links">
      {items.map((item) =>
        "external" in item && item.external ? (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="raycast-nav-link"
          >
            {item.label}
          </a>
        ) : (
          <Link
            key={item.label}
            href={item.href}
            className={`raycast-nav-link ${!isLanding && pathname === item.href ? "active-nav-link" : ""}`}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
