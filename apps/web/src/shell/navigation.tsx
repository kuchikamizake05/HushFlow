import Link from "next/link";

const navItems = [
  ["Trade", "/trade"],
  ["Market", "/market"],
  ["Liquidity", "/liquidity"],
  ["Proof", "/proof"],
  ["Portfolio", "/portfolio"],
] as const;

export function Navigation() {
  return (
    <nav aria-label="Primary navigation" className="primary-navigation">
      {navItems.map(([label, href]) => (
        <Link href={href} key={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
