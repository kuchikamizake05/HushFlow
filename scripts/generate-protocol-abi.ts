import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { format } from "prettier";
import { keccak256, toHex } from "viem";

const ARTIFACT_PATH = "out/HushFlowRfq.sol/HushFlowRfq.json";
const MODULE_PATH = "packages/protocol/src/abi.ts";

export async function renderProtocolAbiModule(input: unknown): Promise<string> {
  if (!Array.isArray(input)) {
    throw new Error("ABI_INVALID");
  }

  const canonicalJson = JSON.stringify(input);
  const hash = keccak256(toHex(canonicalJson));
  const formattedAbi = JSON.stringify(input, null, 2);

  return format(
    [
      'import type { Abi } from "viem";',
      "",
      `export const hushFlowRfqAbi = ${formattedAbi} as const satisfies Abi;`,
      "",
      `export const HUSHFLOW_ABI_HASH = "${hash}" as const;`,
      "",
    ].join("\n"),
    { parser: "typescript" },
  );
}

async function main(): Promise<void> {
  const artifact = JSON.parse(await readFile(ARTIFACT_PATH, "utf8")) as {
    abi?: unknown;
  };
  await writeFile(
    MODULE_PATH,
    await renderProtocolAbiModule(artifact.abi),
    "utf8",
  );
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  await main();
}
