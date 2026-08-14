import fs from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeAbiParameters,
  keccak256,
  toBytes,
  formatUnits,
  hexToBytes,
  concat,
  toHex,
  defineChain,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encryptFccEcies } from "../../packages/crypto/src/ecies.js";
import {
  createSellerMinimumEnvelope,
  createProviderQuoteEnvelope,
} from "../../packages/crypto/src/envelope.js";

const coston2 = defineChain({
  id: 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: {
    decimals: 18,
    name: "Coston2 Flare",
    symbol: "C2FLR",
  },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
});

const loadEnv = () => {
  const content = fs.readFileSync(".env.local", "utf8");
  const map: Record<string, string> = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const idx = trimmed.indexOf("=");
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  });
  return map;
};

const normalizeKey = (key: string): `0x${string}` => {
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
};

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

async function main() {
  const env = loadEnv();
  console.log("==================================================");
  console.log("🚀 HUSHFLOW COSTON2 3-WALLET LIVE DRILL EXECUTION");
  console.log("==================================================");

  const rpcUrl = env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
  const publicClient = createPublicClient({
    chain: coston2,
    transport: http(rpcUrl),
  });

  const deployerKey = normalizeKey(env.HUSHFLOW_DEPLOYER_PRIVATE_KEY || env.HUSHFLOW_SELLER_PRIVATE_KEY);
  const sellerKey = normalizeKey(env.HUSHFLOW_SELLER_PRIVATE_KEY);
  const providerAKey = normalizeKey(env.HUSHFLOW_PROVIDER_A_PRIVATE_KEY);
  const providerBKey = normalizeKey(env.HUSHFLOW_PROVIDER_B_PRIVATE_KEY);

  const deployerAccount = privateKeyToAccount(deployerKey);
  const sellerAccount = privateKeyToAccount(sellerKey);
  const providerAAccount = privateKeyToAccount(providerAKey);
  const providerBAccount = privateKeyToAccount(providerBKey);

  console.log(`[Deployer/Operator]: ${deployerAccount.address}`);
  console.log(`[Seller]:            ${sellerAccount.address}`);
  console.log(`[Provider A]:        ${providerAAccount.address}`);
  console.log(`[Provider B]:        ${providerBAccount.address}`);

  const deployerWallet = createWalletClient({
    account: deployerAccount,
    chain: coston2,
    transport: http(rpcUrl),
  });
  const sellerWallet = createWalletClient({
    account: sellerAccount,
    chain: coston2,
    transport: http(rpcUrl),
  });
  const providerAWallet = createWalletClient({
    account: providerAAccount,
    chain: coston2,
    transport: http(rpcUrl),
  });
  const providerBWallet = createWalletClient({
    account: providerBAccount,
    chain: coston2,
    transport: http(rpcUrl),
  });

  const fxrpAddress = env.COSTON2_EXPECTED_FXRP as Address;
  const usdt0Address = env.COSTON2_EXPECTED_USDT0 as Address;
  const teeExtensionRegistry = env.FCC_TEE_EXTENSION_REGISTRY as Address;
  const teeMachineRegistry = env.FCC_TEE_MACHINE_REGISTRY as Address;
  const teeSigner = env.FCC_TEE_SIGNER as Address;

  let contractAddress = env.HUSHFLOW_CONTRACT_ADDRESS as Address;
  console.log(`\n[CONTRACT] Using HushFlowRfq at: ${contractAddress}`);

  // Fetch TEE Node /info for live ECIES encryption key
  console.log("\n[TEE INFO] Fetching live TEE Public Key from https://fcc.hushflow.dev/info ...");
  const infoRes = await fetch("https://fcc.hushflow.dev/info").then((r) => r.json());
  const teePubKeyX = infoRes.machineData.publicKey.x as Hex;
  const teePubKeyY = infoRes.machineData.publicKey.y as Hex;
  const teePubKey64Bytes = concat([hexToBytes(teePubKeyX), hexToBytes(teePubKeyY)]);
  console.log(`✅ TEE Node Public Key retrieved (Platform: ${infoRes.machineData.platform.slice(0, 18)}...)`);

  const artifact = JSON.parse(
    fs.readFileSync("out/HushFlowRfq.sol/HushFlowRfq.json", "utf8")
  );
  const rfqAbi = artifact.abi;
  const evidence: Array<{ step: number; action: string; txHash: string; explorerUrl: string; details: string }> = [];

  const lotAmount = BigInt(env.HUSHFLOW_LOT_AMOUNT || "1000000"); // 1 FXRP (6 decimals)
  const quoteCap = BigInt(env.HUSHFLOW_QUOTE_CAP || "5000000");   // 5 USDT0 (6 decimals)

  // Step 1: Seller Approve FXRP
  console.log("\n--- Step 1: Seller Approve FXRP ---");
  const approveFxrpTx = await sellerWallet.writeContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [contractAddress, lotAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveFxrpTx });
  console.log(`✅ Step 1 complete: Approved 1 FXRP (tx: ${approveFxrpTx})`);
  evidence.push({
    step: 1,
    action: "APPROVE_FXRP",
    txHash: approveFxrpTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${approveFxrpTx}`,
    details: "Seller approved 1 FXRP custody",
  });

  const nextRfqId = (await publicClient.readContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "nextRfqId",
  })) as bigint;
  console.log(`Target RFQ ID: #${nextRfqId}`);

  // Encrypt Seller Minimum (2 USDT0)
  const sellerEnvelope = createSellerMinimumEnvelope({
    chainId: 114n,
    contractAddress: contractAddress,
    rfqId: nextRfqId,
    sender: sellerAccount.address,
    value: 2_000_000n, // 2 USDT0
  });
  const sellerCiphertextBytes = await encryptFccEcies(teePubKey64Bytes, sellerEnvelope);
  const sellerCiphertext = toHex(sellerCiphertextBytes);

  // Step 2: Seller Create RFQ
  console.log("\n--- Step 2: Seller Create RFQ ---");
  const block = await publicClient.getBlock();
  const currentTimestamp = block.timestamp;
  const quoteDuration = 120n; // 120 seconds (safe buffer above 60s minimum)
  const resolutionDuration = 1800n; // 30 minutes (matches RESOLUTION_DURATION)
  const quoteDeadline = currentTimestamp + quoteDuration;
  const resolutionDeadline = quoteDeadline + resolutionDuration;

  const createRfqTx = await sellerWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "createRfq",
    args: [lotAmount, quoteCap, quoteDeadline, resolutionDeadline, sellerCiphertext],
  });
  await publicClient.waitForTransactionReceipt({ hash: createRfqTx });
  console.log(`✅ Step 2 complete: Created RFQ #${nextRfqId} (tx: ${createRfqTx})`);
  evidence.push({
    step: 2,
    action: "CREATE_RFQ",
    txHash: createRfqTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${createRfqTx}`,
    details: `Created RFQ #${nextRfqId} for 1 FXRP lot with 5 USDT0 cap`,
  });

  // Step 3: Provider A Approve USDT0
  console.log("\n--- Step 3: Provider A Approve USDT0 Collateral ---");
  const approveUsdtATx = await providerAWallet.writeContract({
    address: usdt0Address,
    abi: erc20Abi,
    functionName: "approve",
    args: [contractAddress, quoteCap],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveUsdtATx });
  console.log(`✅ Step 3 complete: Provider A approved 5 USDT0 (tx: ${approveUsdtATx})`);
  evidence.push({
    step: 3,
    action: "APPROVE_USDT0_A",
    txHash: approveUsdtATx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${approveUsdtATx}`,
    details: "Provider A approved 5 USDT0 collateral",
  });

  // Encrypt Quote A (3 USDT0)
  const quoteAEnvelope = createProviderQuoteEnvelope({
    chainId: 114n,
    contractAddress: contractAddress,
    rfqId: nextRfqId,
    sender: providerAAccount.address,
    value: 3_000_000n, // 3 USDT0
  });
  const quoteACiphertextBytes = await encryptFccEcies(teePubKey64Bytes, quoteAEnvelope);
  const quoteACiphertext = toHex(quoteACiphertextBytes);

  // Step 4: Provider A Submit Quote
  console.log("\n--- Step 4: Provider A Submit Encrypted Quote (3 USDT0) ---");
  const submitQuoteATx = await providerAWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "submitQuote",
    args: [nextRfqId, quoteACiphertext],
  });
  await publicClient.waitForTransactionReceipt({ hash: submitQuoteATx });
  console.log(`✅ Step 4 complete: Provider A submitted quote (tx: ${submitQuoteATx})`);
  evidence.push({
    step: 4,
    action: "SUBMIT_QUOTE_A",
    txHash: submitQuoteATx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${submitQuoteATx}`,
    details: "Provider A submitted encrypted quote of 3 USDT0",
  });

  // Step 5: Provider B Approve USDT0
  console.log("\n--- Step 5: Provider B Approve USDT0 Collateral ---");
  const approveUsdtBTx = await providerBWallet.writeContract({
    address: usdt0Address,
    abi: erc20Abi,
    functionName: "approve",
    args: [contractAddress, quoteCap],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveUsdtBTx });
  console.log(`✅ Step 5 complete: Provider B approved 5 USDT0 (tx: ${approveUsdtBTx})`);
  evidence.push({
    step: 5,
    action: "APPROVE_USDT0_B",
    txHash: approveUsdtBTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${approveUsdtBTx}`,
    details: "Provider B approved 5 USDT0 collateral",
  });

  // Encrypt Quote B (4 USDT0 - WINNING QUOTE)
  const quoteBEnvelope = createProviderQuoteEnvelope({
    chainId: 114n,
    contractAddress: contractAddress,
    rfqId: nextRfqId,
    sender: providerBAccount.address,
    value: 4_000_000n, // 4 USDT0
  });
  const quoteBCiphertextBytes = await encryptFccEcies(teePubKey64Bytes, quoteBEnvelope);
  const quoteBCiphertext = toHex(quoteBCiphertextBytes);

  // Step 6: Provider B Submit Quote
  console.log("\n--- Step 6: Provider B Submit Encrypted Quote (4 USDT0 - Winner) ---");
  const submitQuoteBTx = await providerBWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "submitQuote",
    args: [nextRfqId, quoteBCiphertext],
  });
  await publicClient.waitForTransactionReceipt({ hash: submitQuoteBTx });
  console.log(`✅ Step 6 complete: Provider B submitted quote (tx: ${submitQuoteBTx})`);
  evidence.push({
    step: 6,
    action: "SUBMIT_QUOTE_B",
    txHash: submitQuoteBTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${submitQuoteBTx}`,
    details: "Provider B submitted encrypted quote of 4 USDT0 (winner)",
  });

  // Wait for quote deadline
  console.log(`\n⏳ Waiting for quote deadline (${quoteDeadline}) to mature...`);
  while (true) {
    const latestBlock = await publicClient.getBlock();
    if (latestBlock.timestamp > quoteDeadline) break;
    console.log(`Current block timestamp: ${latestBlock.timestamp}, waiting for > ${quoteDeadline}...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log(`✅ Quote window is now closed!`);

  // Step 7: Request Resolution
  console.log("\n--- Step 7: Request Resolution ---");
  const reqResTx = await sellerWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "requestResolution",
    args: [nextRfqId],
    value: 0n,
  });
  const reqResReceipt = await publicClient.waitForTransactionReceipt({ hash: reqResTx });
  console.log(`✅ Step 7 complete: Resolution Requested on Coston2 (tx: ${reqResTx})`);
  
  // Extract actionId from ResolutionRequested event
  const rfqState = (await publicClient.readContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "rfqs",
    args: [nextRfqId],
  })) as any;
  const actionId = rfqState[8] as Hex;
  console.log(`Action ID recorded: ${actionId}`);
  evidence.push({
    step: 7,
    action: "REQUEST_RESOLUTION",
    txHash: reqResTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${reqResTx}`,
    details: `Requested FCC resolution on-chain, actionId: ${actionId}`,
  });

  console.log("\n==================================================");
  console.log("🎉 CORE ON-CHAIN TRANSACTIONS COMPLETED ON COSTON2!");
  console.log("==================================================");
  console.log(JSON.stringify(evidence, null, 2));

  // Save evidence
  fs.writeFileSync(
    "docs/runbooks/coston2-evidence-ledger.json",
    JSON.stringify({ contractAddress, evidence }, null, 2),
    "utf8"
  );
  console.log("Saved evidence ledger to docs/runbooks/coston2-evidence-ledger.json");
}

main().catch(console.error);
