import type { SVGProps } from "react";

export function HushFlowLogo(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size || props.width || 24;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="hf-grad-main" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff5f50" />
          <stop offset="60%" stopColor="#ff4538" />
          <stop offset="100%" stopColor="#d82012" />
        </linearGradient>
        <linearGradient id="hf-grad-accent" x1="14" y1="6" x2="28" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff7b6e" />
          <stop offset="100%" stopColor="#ff3322" />
        </linearGradient>
        <linearGradient id="hf-grad-glow" x1="16" y1="8" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="hf-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#ff4f40" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#hf-shadow)">
        {/* Left Confidential Pillar / Wave */}
        <path
          d="M6 9C6 6.79086 7.79086 5 10 5H12C14.2091 5 16 6.79086 16 9V15C16 17.2091 14.2091 19 12 19H10C7.79086 19 6 17.2091 6 15V9Z"
          fill="url(#hf-grad-main)"
        />
        {/* Right Fluid Settlement Wave */}
        <path
          d="M16 17C16 14.7909 17.7909 13 20 13H22C24.2091 13 26 14.7909 26 17V23C26 25.2091 24.2091 27 22 27H20C17.7909 27 16 25.2091 16 23V17Z"
          fill="url(#hf-grad-accent)"
        />
        {/* Interlocking Fluid Privacy Ribbon */}
        <path
          d="M11 12C11 10.3431 12.3431 9 14 9H18C19.6569 9 21 10.3431 21 12V20C21 21.6569 19.6569 23 18 23H14C12.3431 23 11 21.6569 11 20V12Z"
          fill="url(#hf-grad-main)"
          opacity="0.85"
        />
        {/* Hardware Enclave Core Point */}
        <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
        {/* Top Gloss Highlights */}
        <path
          d="M7 9C7 7.34315 8.34315 6 10 6H12C13.6569 6 15 7.34315 15 9V11H7V9Z"
          fill="url(#hf-grad-glow)"
        />
      </g>
    </svg>
  );
}

export function FlareLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 4H7.5C12.5 4 15.5 7 15.5 11.5C15.5 13 15 14.5 14 15.5L7 22H2L10 13.5C10.8 12.6 11 11.8 11 11C11 8.5 9 7.5 6.5 7.5H3V4Z"
        fill="#ea3431"
      />
      <path
        d="M17 4H21V15C21 19 18 22 13 22H10.5L14 18.5C15.8 16.8 17 14.5 17 11.5V4Z"
        fill="#ea3431"
        opacity="0.85"
      />
    </svg>
  );
}

export function XrpLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M20.2 4H17.4L12 9.5L6.6 4H3.8L10.6 11L3.5 18.2H6.3L12 12.4L17.7 18.2H20.5L13.4 11L20.2 4Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function UsdtLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#26A17B" />
      <path
        d="M13.2 8.2V6.8H10.8V8.2H6.5V10.2H9.2C9.5 12.2 10.8 13.6 12 13.6C13.2 13.6 14.5 12.2 14.8 10.2H17.5V8.2H13.2ZM12 12.4C11.1 12.4 10.3 11.4 10.1 10.2H13.9C13.7 11.4 12.9 12.4 12 12.4ZM12 14.6C10.5 14.6 9.3 13.6 8.8 12.2C8.5 12.9 8.3 13.7 8.3 14.5C8.3 16.5 10 18.1 12 18.1C14 18.1 15.7 16.5 15.7 14.5C15.7 13.7 15.5 12.9 15.2 12.2C14.7 13.6 13.5 14.6 12 14.6Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function CpuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 14h3" />
      <path d="M1 9h3" />
      <path d="M1 14h3" />
    </svg>
  );
}

export function ZapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function RefreshCwIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function CoinsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function FileCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

export function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
