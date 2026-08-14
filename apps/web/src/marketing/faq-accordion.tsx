"use client";

import { useState } from "react";
import { ChevronDownIcon } from "../shell/icons";

const FAQS = [
  {
    q: "Why is a confidential RFQ dark pool needed on Flare?",
    a: "Public AMMs expose pending orders in the mempool, enabling MEV bots to front-run and sandwich trades. HushFlow keeps the seller's minimum price and all maker quotes ECIES-encrypted until the batch is atomically settled, eliminating slippage and leakage.",
  },
  {
    q: "How does Flare Confidential Compute (FCC) protect encrypted data?",
    a: "Flare Confidential Compute uses hardware-isolated Trusted Execution Environments (Intel SGX / TDX). The TEE node holds private decryption keys in protected hardware memory that cannot be read by cloud hosts, operating system admins, or RPC nodes.",
  },
  {
    q: "What prevents market makers from submitting unbacked quotes?",
    a: "Market makers deposit full USDT0 collateral equal to the quote cap upon quote submission. If a maker wins, their quote is settled. Losing makers receive a guaranteed 100% pull-claim collateral refund.",
  },
  {
    q: "How does on-chain smart contract verification work?",
    a: "The TEE enclave evaluates all valid quotes, generates a compact result payload (winner address, price, nonce), and signs it with ECDSA. HushFlowResultVerifier.sol validates the signature on Coston2 before executing the token transfers.",
  },
  {
    q: "Is HushFlow non-custodial?",
    a: "Yes. All assets are held in the non-reentrant HushFlowRfq.sol contract. If the resolution window passes without a valid TEE signature, participants can call timeoutRfq() to reclaim all deposited funds immediately.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="section-container">
      <div className="section-header">
        <div className="section-label">FAQ & SECURITY</div>
        <h2 className="section-title">Frequently Asked Questions</h2>
        <p className="section-subtitle">
          Cryptographic guarantees, hardware enclaves, and non-custodial settlement rules.
        </p>
      </div>

      <div className="faq-list">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="faq-card">
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="faq-trigger"
              >
                <span>{faq.q}</span>
                <ChevronDownIcon
                  width={15}
                  height={15}
                  style={{
                    color: "var(--text-tertiary)",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    flexShrink: 0,
                  }}
                />
              </button>

              {isOpen && (
                <div className="faq-body">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
