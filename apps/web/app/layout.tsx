import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { fixtureReadModel } from "../src/adapters/fixture";
import { AppShell } from "../src/shell/app-shell";

export const metadata: Metadata = {
  title: "HushFlow",
  description: "Private FXRP execution with verifiable settlement.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell provenance={fixtureReadModel.metadata()}>{children}</AppShell>
      </body>
    </html>
  );
}
