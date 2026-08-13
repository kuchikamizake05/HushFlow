import type { MarketSource } from "./presentation";
import { getMarketPresentation } from "./presentation";

export function MarketList({ source }: { source: MarketSource }) {
  const presentation = getMarketPresentation(source);
  return (
    <section className="data-panel" aria-labelledby="market-list-title">
      <p className="eyebrow">{presentation.label}</p>
      <h2 id="market-list-title">Open discovery</h2>
      <ul>
        {presentation.items.map((item) => (
          <li key={item.rfqId}>
            <span>RFQ #{item.rfqId}</span>
            <strong>{item.status}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
