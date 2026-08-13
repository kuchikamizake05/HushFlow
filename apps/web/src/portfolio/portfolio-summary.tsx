import type { PortfolioSource } from "./presentation";
import { getPortfolioPresentation } from "./presentation";

export function PortfolioSummary({ source }: { source: PortfolioSource }) {
  const presentation = getPortfolioPresentation(source);
  return (
    <section className="data-panel" aria-labelledby="portfolio-summary-title">
      <p className="eyebrow">
        {presentation.completeness.toUpperCase()} PORTFOLIO
      </p>
      <h2 id="portfolio-summary-title">History and claims</h2>
      <p>{presentation.message}</p>
      <button disabled={!presentation.claimEnabled} type="button">
        Claim after live preflight
      </button>
    </section>
  );
}
