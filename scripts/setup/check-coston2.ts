import { COSTON2_CHAIN_ID } from "../../packages/protocol/src/constants.js";
import {
  createPublicClient,
  getAddress,
  http,
  parseAbi,
  type Address,
} from "viem";
import { z } from "zod";

const DEFAULT_RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const DOCUMENTED_ASSET_MANAGER = "0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA";
const EXPLORER_USDT0_CANDIDATE = "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F";

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value));

const assetManagerAbi = parseAbi(["function fAsset() view returns (address)"]);
const erc20MetadataAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

function line(message: string): void {
  process.stdout.write(message + "\n");
}

function optionalAddress(name: string): Address | undefined {
  const value = process.env[name];
  return value ? addressSchema.parse(value) : undefined;
}

async function readTokenMetadata(
  client: ReturnType<typeof createPublicClient>,
  address: Address,
): Promise<{ name: string; symbol: string; decimals: number }> {
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    throw new Error("TOKEN_CODE_MISSING");
  }

  const [name, symbol, decimals] = await Promise.all([
    client.readContract({
      abi: erc20MetadataAbi,
      address,
      functionName: "name",
    }),
    client.readContract({
      abi: erc20MetadataAbi,
      address,
      functionName: "symbol",
    }),
    client.readContract({
      abi: erc20MetadataAbi,
      address,
      functionName: "decimals",
    }),
  ]);

  return { decimals, name, symbol };
}

async function main(): Promise<void> {
  const rpcUrl = process.env.COSTON2_RPC_URL ?? DEFAULT_RPC_URL;
  const expectedChainId = Number(
    process.env.COSTON2_EXPECTED_CHAIN_ID ?? COSTON2_CHAIN_ID,
  );
  const assetManager =
    optionalAddress("COSTON2_FXRP_ASSET_MANAGER") ??
    getAddress(DOCUMENTED_ASSET_MANAGER);
  const expectedFxrp = optionalAddress("COSTON2_EXPECTED_FXRP");
  const expectedUsdt0 = optionalAddress("COSTON2_EXPECTED_USDT0");

  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: 10_000 }),
  });

  const chainId = await client.getChainId();
  if (chainId !== expectedChainId || chainId !== COSTON2_CHAIN_ID) {
    throw new Error("UNEXPECTED_CHAIN_ID");
  }
  line("PASS chainId=" + chainId);

  const fxrp = getAddress(
    await client.readContract({
      abi: assetManagerAbi,
      address: assetManager,
      functionName: "fAsset",
    }),
  );
  if (expectedFxrp && fxrp !== expectedFxrp) {
    throw new Error("FXRP_ADDRESS_MISMATCH");
  }
  const fxrpMetadata = await readTokenMetadata(client, fxrp);
  line("PASS fxrp.address=" + fxrp);
  line(
    "PASS fxrp.metadata=" + fxrpMetadata.symbol + "/" + fxrpMetadata.decimals,
  );

  const usdt0 = expectedUsdt0 ?? getAddress(EXPLORER_USDT0_CANDIDATE);
  const usdt0Metadata = await readTokenMetadata(client, usdt0);
  line("PASS usdt0.address=" + usdt0);
  line(
    "PASS usdt0.metadata=" +
      usdt0Metadata.symbol +
      "/" +
      usdt0Metadata.decimals,
  );

  if (!expectedFxrp) {
    line("WARN COSTON2_EXPECTED_FXRP is not frozen in local configuration");
  }
  if (!expectedUsdt0) {
    line(
      "BLOCKED COSTON2_EXPECTED_USDT0 still requires official-faucet confirmation",
    );
    process.exitCode = 2;
  }
}

await main();
