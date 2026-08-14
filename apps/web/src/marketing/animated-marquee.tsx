"use client";

import { ShieldIcon, LockIcon, CpuIcon, ZapIcon, RefreshCwIcon, FileCheckIcon } from "../shell/icons";

const HIGHLIGHTS = [
  { icon: LockIcon, text: "ECIES-secp256k1 Encryption" },
  { icon: ShieldIcon, text: "Zero Information Leakage in Mempool" },
  { icon: CpuIcon, text: "Hardware TEE Enclave Matching" },
  { icon: ZapIcon, text: "Flare Coston2 Testnet (Chain ID 114)" },
  { icon: RefreshCwIcon, text: "100% Non-Custodial Smart Contract Escrow" },
  { icon: FileCheckIcon, text: "ECDSA Secp256k1 Attestation Verifier" },
];

export function AnimatedMarquee() {
  return (
    <div className="marquee-wrapper">
      <div className="marquee-content">
        {HIGHLIGHTS.concat(HIGHLIGHTS).map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="marquee-item">
              <Icon width={14} height={14} style={{ color: "var(--raycast-red)" }} />
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
