import { describe, expect, it, vi } from "vitest";

import { encodeRfqCursor } from "../../services/indexer/src/api/cursor.js";
import { ReadRepository } from "../../services/indexer/src/api/repository.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";

function row(rfqId: string) {
  return {
    rfq_id: rfqId,
    seller: ACCOUNT.toLowerCase(),
    lot_amount: "100",
    quote_cap: "250",
    quote_deadline: "1700000100",
    resolution_deadline: "1700001900",
    status: "SETTLED",
    provider_count: 1,
    winning_provider: OTHER.toLowerCase(),
    winning_quote: "240",
    action_id: `0x${"a".repeat(64)}`,
    fxrp_amount: "0",
    usdt0_amount: "240",
    claimed: false,
  };
}

describe("portfolio pagination", () => {
  it("uses one stable combined seller/provider query and opaque cursor", async () => {
    const query = vi.fn(async (text: string, values?: unknown[]) => {
      void text;
      void values;
      return { rows: [row("3"), row("2"), row("1")] };
    });
    const repository = new ReadRepository({ query } as never, {
      chainId: 114,
      fxrpToken: OTHER,
      usdt0Token: "0x3333333333333333333333333333333333333333",
    });

    const page = await repository.getPortfolio(ACCOUNT, { limit: 2 });

    expect(query).toHaveBeenCalledOnce();
    expect(page.rfqs.map(({ rfqId }) => rfqId)).toEqual(["3", "2"]);
    expect(page.nextCursor).toBe(encodeRfqCursor({ rfqId: "2" }));
    expect(query.mock.calls[0]?.[0]).toContain("EXISTS");
  });
});
