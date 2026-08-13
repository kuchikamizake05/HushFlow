import { MarketList } from "../../src/market/market-list";
import { fixtureMarket } from "../../src/market/presentation";
import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function MarketPage() {
  return (
    <RfqRouteShell eyebrow="MARKET">
      <MarketList source={fixtureMarket} />
    </RfqRouteShell>
  );
}
