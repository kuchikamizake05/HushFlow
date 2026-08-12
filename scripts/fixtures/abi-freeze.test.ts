import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { keccak256, toHex } from "viem";

import {
  HUSHFLOW_ABI_HASH,
  hushFlowRfqAbi,
} from "../../packages/protocol/src/abi.js";
import { renderProtocolAbiModule } from "../generate-protocol-abi.js";

const REQUIRED_FUNCTIONS = [
  "accounting",
  "cancelRfq",
  "claim",
  "claimable",
  "createRfq",
  "initializeTeeSigner",
  "providers",
  "requestResolution",
  "setExtensionId",
  "submitQuote",
  "submitResult",
  "timeoutRfq",
] as const;

const REQUIRED_EVENTS = [
  "Claimed",
  "ExtensionIdInitialized",
  "QuoteSubmitted",
  "ResolutionRequested",
  "RfqCancelled",
  "RfqCreated",
  "RfqFinalized",
  "RfqTimedOut",
  "TeeSignerInitialized",
] as const;

describe("M3 canonical HushFlow ABI", () => {
  it("exports every integrated M2 public function and event", () => {
    const functions = hushFlowRfqAbi
      .filter((item) => item.type === "function")
      .map((item) => item.name);
    const events = hushFlowRfqAbi
      .filter((item) => item.type === "event")
      .map((item) => item.name);

    expect(functions).toEqual(expect.arrayContaining(REQUIRED_FUNCTIONS));
    expect(events).toEqual(expect.arrayContaining(REQUIRED_EVENTS));
  });

  it("publishes the keccak hash of its canonical JSON representation", () => {
    expect(HUSHFLOW_ABI_HASH).toBe(
      keccak256(toHex(JSON.stringify(hushFlowRfqAbi))),
    );
    expect(HUSHFLOW_ABI_HASH).not.toBe(`0x${"0".repeat(64)}`);
  });

  it("has no drift from the current Forge artifact", async () => {
    const artifact = JSON.parse(
      await readFile("out/HushFlowRfq.sol/HushFlowRfq.json", "utf8"),
    ) as { abi: unknown };
    const checkedIn = await readFile(
      "packages/protocol/src/abi.ts",
      "utf8",
    );

    expect(renderProtocolAbiModule(artifact.abi)).toBe(checkedIn);
  });
});
