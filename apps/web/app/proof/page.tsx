import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function ProofPage() {
  return (
    <RfqRouteShell eyebrow="PROOF CENTER" status="SETTLED">
      <p>
        Proof Center will show partial or verified evidence. Fixture records are
        always labelled partial.
      </p>
    </RfqRouteShell>
  );
}
