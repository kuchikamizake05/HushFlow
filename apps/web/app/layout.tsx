import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { fixtureReadModel } from "../src/adapters/fixture";
import type { DataProvenance } from "../src/adapters/contracts";
import { ReadModelError, loadServerReadModel } from "../src/adapters/m4a";
import { AppShell } from "../src/shell/app-shell";
import { Web3Provider } from "../src/providers/web3-provider";

export const metadata: Metadata = {
  title: "HushFlow — Confidential RFQ & Dark Pool on Flare",
  description:
    "Institutional confidential RFQ and dark pool for FXRP & USDT0, powered by Flare Confidential Compute (FCC) and TEE hardware.",
  icons: {
    icon: "/favicon.ico",
  },
};

async function resolveProvenance(): Promise<DataProvenance | null> {
  if (!process.env.M4A_READ_API_URL) return fixtureReadModel.metadata();
  try {
    return (await loadServerReadModel("/metadata")) as DataProvenance;
  } catch (error) {
    if (error instanceof ReadModelError) return null;
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const provenance = await resolveProvenance();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Geist:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Web3Provider>
          <AppShell provenance={provenance}>{children}</AppShell>
        </Web3Provider>
      </body>
    </html>
  );
}
