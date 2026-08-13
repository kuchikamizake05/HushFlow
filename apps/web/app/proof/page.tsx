import { ProofCenter } from "../../src/proof/proof-center";
import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function ProofPage() {
  return (
    <RfqRouteShell eyebrow="PROOF CENTER" status="SETTLED">
      <ProofCenter
        evidence={{ evidenceStatus: "PARTIAL", reason: "FIXTURE_DATA" }}
      />
    </RfqRouteShell>
  );
}
