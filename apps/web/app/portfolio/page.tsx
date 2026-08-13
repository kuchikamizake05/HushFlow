import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function PortfolioPage() {
  return (
    <RfqRouteShell eyebrow="PORTFOLIO" status="SETTLED">
      <p>
        Connect a wallet to inspect indexed history. Indexed claims never
        authorize a claim transaction.
      </p>
      <button disabled type="button">
        Claim after live preflight
      </button>
    </RfqRouteShell>
  );
}
