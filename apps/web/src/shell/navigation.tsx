"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Trade", href: "/trade" },
  { label: "Liquidity", href: "/liquidity" },
  { label: "Proof Center", href: "/proof" },
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

  return (
    <nav aria-label="Primary navigation" className="raycast-nav-links">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`raycast-nav-link ${isActive ? "active-nav-link" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
