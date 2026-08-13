import type { ReactNode } from "react";

import type { RfqStatus } from "./lifecycle";
import { derivePresentationState } from "./lifecycle";

export function RfqRouteShell({
  eyebrow,
  status = "OPEN",
  children,
}: {
  eyebrow: string;
  status?: RfqStatus;
  children?: ReactNode;
}) {
  const state = derivePresentationState(status);
  return (
    <section className="route-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{state.title}</h1>
      <p className="route-description">{state.description}</p>
      {children}
      <p className="preflight-note" role="status">
        Wallet actions are disabled until live deployment and direct contract
        preflight succeed.
      </p>
    </section>
  );
}
