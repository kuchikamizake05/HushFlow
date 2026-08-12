import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  ProjectorError,
  applyProjectorEvent,
  createProjection,
  snapshotProjection,
} from "../../services/indexer/src/domain/projector.js";
import {
  toProjectorEvent,
  type ProjectorEvent,
} from "../../services/indexer/src/domain/events.js";

type Fixture = {
  logs: Array<{ expected: unknown }>;
};

async function events(): Promise<Array<ProjectorEvent | null>> {
  const fixture = JSON.parse(
    await readFile("packages/protocol/fixtures/v1/events.json", "utf8"),
  ) as Fixture;
  return fixture.logs.map(({ expected }) => toProjectorEvent(expected));
}

function requireEvent(
  value: ProjectorEvent | null | undefined,
): ProjectorEvent {
  if (!value) throw new Error("TEST_EVENT_MISSING");
  return value;
}

describe("deterministic event projector", () => {
  it("adapts only lifecycle events from strict M3 decoded records", async () => {
    const decoded = await events();

    expect(decoded.slice(0, 2)).toEqual([null, null]);
    expect(decoded.slice(2).map((event) => event?.eventName)).toEqual([
      "RfqCreated",
      "QuoteSubmitted",
      "RfqCancelled",
      "ResolutionRequested",
      "RfqFinalized",
      "RfqTimedOut",
      "Claimed",
    ]);
  });

  it("projects an RFQ lifecycle into a stable JSON-safe snapshot", async () => {
    const decoded = await events();
    const state = createProjection();

    for (const index of [2, 3, 5, 6, 8]) {
      applyProjectorEvent(state, requireEvent(decoded[index]));
    }

    expect(snapshotProjection(state)).toEqual({
      rfqs: [
        {
          rfqId: "1",
          seller: "0x1111111111111111111111111111111111111111",
          lotAmount: "1000000",
          quoteCap: "2500000",
          quoteDeadline: "1700000100",
          resolutionDeadline: "1700001900",
          sellerCiphertext: "0x1234",
          status: "SETTLED",
          providerCount: 1,
          actionId:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          winningProvider: "0x2222222222222222222222222222222222222222",
          winningQuote: "2400000",
        },
      ],
      providers: [
        {
          rfqId: "1",
          provider: "0x2222222222222222222222222222222222222222",
          position: 0,
          quoteCiphertext: "0xabcd",
          submittedAtBlock: "123459",
        },
      ],
      actions: [
        {
          rfqId: "1",
          actionId:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          status: "RESOLVED",
          requestedAtBlock: "123461",
        },
      ],
      outcomes: [
        {
          rfqId: "1",
          resultType: "TRADE",
          winningProvider: "0x2222222222222222222222222222222222222222",
          winningQuote: "2400000",
          resultNonce:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
      claims: [
        {
          rfqId: "1",
          account: "0x1111111111111111111111111111111111111111",
          fxrpAmount: "1000000",
          usdt0Amount: "2400000",
          claimed: true,
        },
      ],
    });
    expect(() => JSON.stringify(snapshotProjection(state))).not.toThrow();
  });

  it("is idempotent for the same source event", async () => {
    const created = requireEvent((await events())[2]);
    const state = createProjection();

    applyProjectorEvent(state, created);
    applyProjectorEvent(state, created);

    expect(snapshotProjection(state).rfqs).toHaveLength(1);
  });

  it("rejects invalid event ordering without partial mutation", async () => {
    const quote = requireEvent((await events())[3]);
    const state = createProjection();

    expect(() => applyProjectorEvent(state, quote)).toThrow(ProjectorError);
    expect(snapshotProjection(state).providers).toEqual([]);
  });

  it.each([
    ["RfqCancelled", 4, "CANCELLED"],
    ["RfqTimedOut", 7, "TIMED_OUT"],
  ] as const)("projects %s terminal state", async (_name, eventIndex, status) => {
    const decoded = await events();
    const originalCreated = requireEvent(decoded[2]);
    if (originalCreated.eventName !== "RfqCreated") throw new Error("BAD_TEST");
    const terminal = requireEvent(decoded[eventIndex]);
    const rfqId = terminal.eventName === "RfqCancelled" ? "2" : "3";
    const created: ProjectorEvent = {
      ...originalCreated,
      rfqId,
      source: { ...originalCreated.source, logIndex: eventIndex + 20 },
    };
    const state = createProjection();

    applyProjectorEvent(state, created);
    applyProjectorEvent(state, terminal);

    expect(snapshotProjection(state).rfqs[0]?.status).toBe(status);
  });

  it("rejects unknown fields and malformed public values", async () => {
    const fixture = JSON.parse(
      await readFile("packages/protocol/fixtures/v1/events.json", "utf8"),
    ) as Fixture;
    const created = fixture.logs[2]?.expected;

    expect(() =>
      toProjectorEvent({
        ...(created as object),
        plaintextMinimum: "PRIVATE_MARKER_42",
      }),
    ).toThrowError("PROJECTOR_EVENT_INVALID");
  });
});
