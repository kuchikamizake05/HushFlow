import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { fixtureReadModel } from "../src/adapters/fixture";
import type { DataProvenance } from "../src/adapters/contracts";
import { ReadModelError, loadServerReadModel } from "../src/adapters/m4a";
import { AppShell } from "../src/shell/app-shell";

export const metadata: Metadata = {
  title: "HushFlow",
  description: "Private FXRP execution with verifiable settlement.",
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
      <body>
        <AppShell provenance={provenance}>{children}</AppShell>
      </body>
    </html>
  );
}
