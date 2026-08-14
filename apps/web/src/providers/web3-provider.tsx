"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  connectorsForWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { defineChain } from "viem";

export const flareCoston2 = defineChain({
  id: 114,
  name: "Flare",
  nativeCurrency: {
    decimals: 18,
    name: "Flare",
    symbol: "FLR",
  },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Flare Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular Wallets",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        rabbyWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "HushFlow Protocol",
    projectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
      "c4a93cf4763321481e3a9673322f98f6",
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [flareCoston2],
  transports: {
    [flareCoston2.id]: http("https://coston2-api.flare.network/ext/C/rpc"),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={flareCoston2}
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#ff4f40",
            accentColorForeground: "#ffffff",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
