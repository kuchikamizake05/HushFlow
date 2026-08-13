import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function LiquidityPage() {
  return (
    <RfqRouteShell eyebrow="LIQUIDITY DESK">
      <p>
        Review public opportunities here. Private quotes never enter the read
        adapter.
      </p>
      <button disabled type="button">
        Quote after live preflight
      </button>
    </RfqRouteShell>
  );
}
