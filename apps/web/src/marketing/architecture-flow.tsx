"use client";

import { useState, useEffect } from "react";
import { LockIcon, LayersIcon, CpuIcon, FileCheckIcon } from "../shell/icons";

const FLOW_NODES = [
  {
    id: "client",
    tag: "CLIENT_SIDE",
    icon: LockIcon,
    title: "1. Client ECIES Encryption",
    detail: "Seller and Makers encrypt minimum prices and quotes using Flare TEE's secp256k1 public key directly in browser memory before broadcasting.",
    spec: "ECIES-secp256k1 + AES-256-GCM",
    metric: "0 bytes exposed",
  },
  {
    id: "escrow",
    tag: "SMART_CONTRACT",
    icon: LayersIcon,
    title: "2. Coston2 Escrow Custody",
    detail: "Smart contract deposits FXRP lots and USDT0 collateral in immutable escrow. Searchers in the mempool only see opaque ciphertexts.",
    spec: "HushFlowRfq.sol",
    metric: "100% Non-Custodial",
  },
  {
    id: "enclave",
    tag: "HARDWARE_TEE",
    icon: CpuIcon,
    title: "3. Flare TEE Matching",
    detail: "Hardware enclave decrypts sealed bids inside isolated CPU memory, determines the optimal clearing price, and signs execution certificate.",
    spec: "FCC TEE Node v0.0.24",
    metric: "AMD SEV-SNP Enclave",
  },
  {
    id: "verifier",
    tag: "ON_CHAIN_PROOFS",
    icon: FileCheckIcon,
    title: "4. Coston2 Settlement",
    detail: "On-chain verifier checks TEE signature and domain hash. Releases funds to seller and winner while issuing instant 100% collateral refunds.",
    spec: "HushFlowResultVerifier.sol",
    metric: "Atomic Payout",
  },
];

export function ArchitectureFlow() {
  const [selectedNode, setSelectedNode] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedNode((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentNode = FLOW_NODES[selectedNode] ?? FLOW_NODES[0]!;

  return (
    <section id="architecture" className="section-container">
      <div className="section-header">
        <div className="section-label">SYSTEM ARCHITECTURE</div>
        <h2 className="section-title">Confidential Execution Pipeline</h2>
        <p className="section-subtitle">
          How hardware TEE enclaves and ECIES cryptography eliminate mempool information leakage.
        </p>
      </div>

      {/* Animated Pipeline Nodes */}
      <div className="pipeline-grid">
        {FLOW_NODES.map((node, index) => {
          const isActive = selectedNode === index;
          const Icon = node.icon;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(index)}
              className={`pipeline-card ${isActive ? "active" : ""}`}
            >
              <div className="pipeline-card-header">
                <span className="pipeline-icon">
                  <Icon width={18} height={18} />
                </span>
                <span className="pipeline-tag">{node.tag}</span>
              </div>
              <div className="pipeline-card-title">{node.title}</div>
              <div className="pipeline-card-spec">{node.spec}</div>
              <div className="pipeline-card-metric">{node.metric}</div>
              {isActive && <div className="pipeline-glow-bar" />}
            </button>
          );
        })}
      </div>

      {/* Detailed Live Stage Inspector Card */}
      <div className="pipeline-inspector">
        <div className="inspector-header">
          <div className="inspector-badge">
            <span className="pulse-dot-red" />
            <span>ACTIVE_STAGE: 0{selectedNode + 1} — {currentNode.tag}</span>
          </div>
          <span className="inspector-spec">{currentNode.spec}</span>
        </div>
        <p className="inspector-text">{currentNode.detail}</p>
      </div>
    </section>
  );
}
