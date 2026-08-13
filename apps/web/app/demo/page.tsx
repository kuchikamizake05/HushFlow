import { DemoJourney } from "../../src/demo/demo-journey";
import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function DemoPage() {
  return (
    <RfqRouteShell eyebrow="JUDGE DEMO">
      <p>
        This guided local-fixture journey explains the protocol. It is not
        live-chain evidence.
      </p>
      <DemoJourney />
    </RfqRouteShell>
  );
}
