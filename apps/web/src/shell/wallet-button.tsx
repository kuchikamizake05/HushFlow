"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function HeaderWalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="raycast-cta-btn"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 7h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                      <path d="M16 12h.01" />
                    </svg>
                    <span>Connect Wallet</span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="raycast-cta-btn chain-switch-btn"
                  >
                    <span
                      className="raycast-search-dot"
                      style={{ background: "#ef4444", boxShadow: "0 0 6px #ef4444" }}
                    />
                    <span>Switch to Flare</span>
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="raycast-wallet-connected-pill"
                >
                  <span className="raycast-search-dot" />
                  <span className="wallet-address-text">{account.displayName}</span>
                  {account.displayBalance ? (
                    <span className="wallet-balance-text">
                      {account.displayBalance}
                    </span>
                  ) : null}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
