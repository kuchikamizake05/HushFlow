import { RfqRouteShell } from "../../src/rfq/route-shell";
import { TradeForm } from "../../src/rfq/trade-form";

export default function TradePage() {
  return (
    <RfqRouteShell eyebrow="PRIVATE RFQ">
      <p>
        Enter the seller minimum only here. It is never sent to read APIs, URLs,
        or persistent browser storage.
      </p>
      <TradeForm />
    </RfqRouteShell>
  );
}
