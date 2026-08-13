import { fixturePortfolio } from "../../src/portfolio/presentation";
import { PortfolioSummary } from "../../src/portfolio/portfolio-summary";
import { RfqRouteShell } from "../../src/rfq/route-shell";

export default function PortfolioPage() {
  return (
    <RfqRouteShell eyebrow="PORTFOLIO" status="SETTLED">
      <PortfolioSummary source={fixturePortfolio} />
    </RfqRouteShell>
  );
}
