import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { decodeHushFlowEvent } from "../../packages/protocol/src/events.js";

const CONTRACT_ADDRESS = "0x9999999999999999999999999999999999999999";
const OTHER_ADDRESS = "0x8888888888888888888888888888888888888888";

type EventFixture = {
  schemaVersion: number;
  generator: string;
  logs: Array<{
    schemaVersion: number;
    chainId: number;
    address: string;
    blockNumber: string;
    transactionHash: string;
    logIndex: number;
    topics: string[];
    data: string;
    expected: unknown;
  }>;
};

async function loadFixture(): Promise<EventFixture> {
  return JSON.parse(
    await readFile("packages/protocol/fixtures/v1/events.json", "utf8"),
  ) as EventFixture;
}

function stripExpected(entry: EventFixture["logs"][number]) {
  const { expected, ...log } = entry;
  void expected;
  return log;
}

describe("M3 strict HushFlow event decoding", () => {
  it("decodes every lifecycle fixture into stable JSON-safe records", async () => {
    const fixture = await loadFixture();

    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.generator).toBe("hushflow-m3-event-fixture-v1");
    expect(fixture.logs).toHaveLength(9);

    for (const { expected, ...log } of fixture.logs) {
      const decoded = decodeHushFlowEvent(log, {
        chainId: 114,
        contractAddress: CONTRACT_ADDRESS,
      });

      expect(decoded).toEqual(expected);
      expect(() => JSON.stringify(decoded)).not.toThrow();
    }
  });

  it("rejects a log from the wrong contract", async () => {
    const log = stripExpected((await loadFixture()).logs[0]!);

    expect(() =>
      decodeHushFlowEvent(log, {
        chainId: 114,
        contractAddress: OTHER_ADDRESS,
      }),
    ).toThrowError("EVENT_CONTRACT_MISMATCH");
  });

  it("rejects a log from the wrong chain", async () => {
    const log = stripExpected((await loadFixture()).logs[0]!);

    expect(() =>
      decodeHushFlowEvent(log, {
        chainId: 115,
        contractAddress: CONTRACT_ADDRESS,
      }),
    ).toThrowError("EVENT_CHAIN_MISMATCH");
  });

  it("rejects unsupported schema versions", async () => {
    const log = stripExpected((await loadFixture()).logs[0]!);

    expect(() =>
      decodeHushFlowEvent(
        { ...log, schemaVersion: 2 },
        { chainId: 114, contractAddress: CONTRACT_ADDRESS },
      ),
    ).toThrowError("EVENT_SCHEMA_VERSION_UNSUPPORTED");
  });

  it("rejects an unknown event signature", async () => {
    const log = stripExpected((await loadFixture()).logs[0]!);

    expect(() =>
      decodeHushFlowEvent(
        { ...log, topics: [`0x${"0".repeat(64)}`, ...log.topics.slice(1)] },
        { chainId: 114, contractAddress: CONTRACT_ADDRESS },
      ),
    ).toThrowError("EVENT_SIGNATURE_UNKNOWN");
  });

  it.each([
    ["missing indexed field", (topics: string[]) => topics.slice(0, -1)],
    ["extra indexed field", (topics: string[]) => [...topics, topics[1]!]],
  ])("rejects malformed topic count: %s", async (_label, mutateTopics) => {
    const log = stripExpected((await loadFixture()).logs[2]!);

    expect(() =>
      decodeHushFlowEvent(
        { ...log, topics: mutateTopics(log.topics) },
        { chainId: 114, contractAddress: CONTRACT_ADDRESS },
      ),
    ).toThrowError("EVENT_TOPIC_COUNT_INVALID");
  });

  it("rejects malformed non-indexed event data", async () => {
    const log = stripExpected((await loadFixture()).logs[2]!);

    expect(() =>
      decodeHushFlowEvent(
        { ...log, data: "0x12" },
        { chainId: 114, contractAddress: CONTRACT_ADDRESS },
      ),
    ).toThrowError("EVENT_DATA_INVALID");
  });

  it("rejects unknown log fields before consumer adapters see them", async () => {
    const log = stripExpected((await loadFixture()).logs[0]!);

    expect(() =>
      decodeHushFlowEvent(
        { ...log, decryptedQuote: "2400000" },
        { chainId: 114, contractAddress: CONTRACT_ADDRESS },
      ),
    ).toThrowError("EVENT_LOG_INVALID");
  });
});
