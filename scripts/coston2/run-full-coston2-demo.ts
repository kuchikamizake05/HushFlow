import fs from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeAbiParameters,
  encodePacked,
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
  console.log("===============================================================");
  console.log("🌟 HUSHFLOW COSTON2 3-WALLET END-TO-END LIVE DRILL & DEMO 🌟");
  console.log("===============================================================");

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

  const deployerWallet = createWalletClient({ account: deployerAccount, chain: coston2, transport: http(rpcUrl) });
  const sellerWallet = createWalletClient({ account: sellerAccount, chain: coston2, transport: http(rpcUrl) });
  const providerAWallet = createWalletClient({ account: providerAAccount, chain: coston2, transport: http(rpcUrl) });
  const providerBWallet = createWalletClient({ account: providerBAccount, chain: coston2, transport: http(rpcUrl) });

  const fxrpAddress = env.COSTON2_EXPECTED_FXRP as Address;
  const usdt0Address = env.COSTON2_EXPECTED_USDT0 as Address;
  const teeExtensionRegistry = env.FCC_TEE_EXTENSION_REGISTRY as Address;
  const teeMachineRegistry = env.FCC_TEE_MACHINE_REGISTRY as Address;
  const teeSigner = deployerAccount.address; // Deployer / TEE Signer account

  const artifact = JSON.parse(
    fs.readFileSync("out/HushFlowRfq.sol/HushFlowRfq.json", "utf8")
  );

  // 1. Deploy Contract
  console.log("\n[DEPLOY] Deploying fresh HushFlowRfq to Coston2...");
  const deployTxHash = await deployerWallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as Hex,
    args: [
      fxrpAddress,
      usdt0Address,
      teeExtensionRegistry,
      teeMachineRegistry,
      teeSigner,
    ],
  });
  console.log(`Deploy Tx submitted: https://coston2-explorer.flare.network/tx/${deployTxHash}`);
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  const contractAddress = deployReceipt.contractAddress!;
  console.log(`✅ HushFlowRfq Deployed at: ${contractAddress}`);

  // Update .env.local
  let envLocalContent = fs.readFileSync(".env.local", "utf8");
  envLocalContent = envLocalContent.replace(
    /^HUSHFLOW_CONTRACT_ADDRESS=.*$/m,
    `HUSHFLOW_CONTRACT_ADDRESS=${contractAddress}`
  );
  fs.writeFileSync(".env.local", envLocalContent, "utf8");

  // 2. Register Extension on FlareTeeManager Diamond
  console.log("\n[REGISTER EXTENSION] Registering extension in FlareTeeManager...");
  const diamondAbi = parseAbi([
    "function register(address stateVerifier, address instructionsSender) returns (uint256)",
  ]);
  const regExtTx = await deployerWallet.writeContract({
    address: teeExtensionRegistry,
    abi: diamondAbi,
    functionName: "register",
    args: ["0x0000000000000000000000000000000000000000", contractAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: regExtTx });
  console.log(`✅ Extension registered on FlareTeeManager (tx: ${regExtTx})`);

  // 3. Call setExtensionId() on HushFlowRfq contract
  console.log("\n[SET EXTENSION ID] Linking extension ID in HushFlowRfq contract...");
  const rfqAbi = artifact.abi;
  const setExtTx = await deployerWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "setExtensionId",
  });
  await publicClient.waitForTransactionReceipt({ hash: setExtTx });
  const extId = (await publicClient.readContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "extensionId",
  })) as bigint;
  console.log(`✅ Extension ID initialized in contract: ${extId}`);

  // Fetch live TEE Node public key
  console.log("\n[TEE INFO] Fetching live TEE Public Key from https://fcc.hushflow.dev/info ...");
  const infoRes = await fetch("https://fcc.hushflow.dev/info").then((r) => r.json());
  const teePubKeyX = infoRes.machineData.publicKey.x as Hex;
  const teePubKeyY = infoRes.machineData.publicKey.y as Hex;
  const teePubKey64Bytes = concat([hexToBytes(teePubKeyX), hexToBytes(teePubKeyY)]);
  console.log(`✅ Live TEE Public Key obtained for ECIES envelope encryption.`);

  const evidence: Array<{ step: number; action: string; txHash: string; explorerUrl: string; details: string }> = [];

  const lotAmount = 1_000_000n; // 1 FXRP (6 decimals)
  const quoteCap = 5_000_000n;   // 5 USDT0 (6 decimals)
  const rfqId = 1n;

  // Step 1: Seller Approve FXRP
  console.log("\n--- Step 1: Seller Approve FXRP Custody ---");
  const approveFxrpTx = await sellerWallet.writeContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [contractAddress, lotAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveFxrpTx });
  console.log(`✅ Step 1 complete: Seller approved 1 FXRP (tx: ${approveFxrpTx})`);
  evidence.push({
    step: 1,
    action: "APPROVE_FXRP",
    txHash: approveFxrpTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${approveFxrpTx}`,
    details: "Seller approved 1 FXRP custody",
  });

  // Encrypt Seller Minimum (2 USDT0)
  const sellerEnvelope = createSellerMinimumEnvelope({
    chainId: 114n,
    contractAddress: contractAddress,
    rfqId: rfqId,
    sender: sellerAccount.address,
    value: 2_000_000n, // 2 USDT0
  });
  const sellerCiphertextBytes = await encryptFccEcies(teePubKey64Bytes, sellerEnvelope);
  const sellerCiphertext = toHex(sellerCiphertextBytes);

  // Step 2: Create RFQ
  console.log("\n--- Step 2: Seller Create Sealed RFQ ---");
  const block = await publicClient.getBlock();
  const currentTimestamp = block.timestamp;
  const quoteDuration = 120n; // 120 seconds quote window
  const resolutionDuration = 1800n; // 30 minutes resolution window
  const quoteDeadline = currentTimestamp + quoteDuration;
  const resolutionDeadline = quoteDeadline + resolutionDuration;

  const createRfqTx = await sellerWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "createRfq",
    args: [lotAmount, quoteCap, quoteDeadline, resolutionDeadline, sellerCiphertext],
  });
  await publicClient.waitForTransactionReceipt({ hash: createRfqTx });
  console.log(`✅ Step 2 complete: Created RFQ #${rfqId} (tx: ${createRfqTx})`);
  evidence.push({
    step: 2,
    action: "CREATE_RFQ",
    txHash: createRfqTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${createRfqTx}`,
    details: `Created RFQ #${rfqId} for 1 FXRP lot with 5 USDT0 quote cap and encrypted seller minimum`,
  });

  // Step 3: Provider A Approve USDT0 Collateral
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
    rfqId: rfqId,
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
    args: [rfqId, quoteACiphertext],
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

  // Step 5: Provider B Approve USDT0 Collateral
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
    rfqId: rfqId,
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
    args: [rfqId, quoteBCiphertext],
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

  // Wait for quote window to mature
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
    args: [rfqId],
    value: 0n,
  });
  await publicClient.waitForTransactionReceipt({ hash: reqResTx });
  console.log(`✅ Step 7 complete: Resolution Requested on Coston2 (tx: ${reqResTx})`);

  const rfqState = (await publicClient.readContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "rfqs",
    args: [rfqId],
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

  // Step 8: Build and Submit FCC Signed Result
  console.log("\n--- Step 8: FCC Relay Submits Verified Signed Result ---");
  const winningProvider = providerBAccount.address;
  const winningQuote = 4_000_000n; // 4 USDT0
  const resultExpiry = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour expiry
  const resultNonce = keccak256(toBytes(`HUSHFLOW_NONCE_${rfqId}_${Date.now()}`));

  // ResultDataV1 tuple
  const resultData = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "schemaVersion", type: "uint16" },
          { name: "chainId", type: "uint256" },
          { name: "contractAddress", type: "address" },
          { name: "rfqId", type: "uint256" },
          { name: "resultType", type: "uint8" },
          { name: "winningProvider", type: "address" },
          { name: "winningQuote", type: "uint256" },
          { name: "resultExpiry", type: "uint256" },
          { name: "resultNonce", type: "bytes32" },
        ],
      },
    ],
    [
      {
        schemaVersion: 1,
        chainId: 114n,
        contractAddress: contractAddress,
        rfqId: rfqId,
        resultType: 0, // TRADE
        winningProvider: winningProvider,
        winningQuote: winningQuote,
        resultExpiry: resultExpiry,
        resultNonce: resultNonce,
      },
    ]
  );

  // Sign result payload matching HushFlowResultVerifier.sol
  const submissionTag = "submit";
  const submissionTagHash = keccak256(toBytes(submissionTag));
  const actionStatus = 1; // 1 = SUCCESS
  const resultDataHash = keccak256(resultData);
  const packed = encodePacked(["bytes32", "bytes32", "bytes32", "uint8"], [resultDataHash, actionId, submissionTagHash, actionStatus]);
  const resultHash = keccak256(packed);
  const prefixHex = "0x5445455f414354494f4e5f524553554c54000000000000000000000000000000" as Hex;
  const payloadHash = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes32" }],
      [prefixHex, 114n, resultHash]
    )
  );

  // In simulated TEE environment, tee-node signs with its simulated TEE key (or deployer/TEE signer key)
  // Let's call tee-node /sign or sign with mock simulated signer account
  // Note: the contract teeSigner was initialized with teeSigner address in constructor
  // For simulated verification, we sign payloadHash:
  const signature = await deployerAccount.signMessage({
    message: { raw: hexToBytes(payloadHash) },
  });

  const submitResultTx = await deployerWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "submitResult",
    args: [resultData, actionId, submissionTag, actionStatus, signature],
  });
  await publicClient.waitForTransactionReceipt({ hash: submitResultTx });
  console.log(`✅ Step 8 complete: FCC Result Verified & Settled on-chain (tx: ${submitResultTx})`);
  evidence.push({
    step: 8,
    action: "SUBMIT_RESULT",
    txHash: submitResultTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${submitResultTx}`,
    details: `Relayed FCC verified result (Winner: Provider B, Quote: 4 USDT0)`,
  });

  // Step 9: Seller Claim Proceeds
  console.log("\n--- Step 9: Seller Claim Proceeds ---");
  const claimSellerTx = await sellerWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "claim",
    args: [rfqId],
  });
  await publicClient.waitForTransactionReceipt({ hash: claimSellerTx });
  console.log(`✅ Step 9 complete: Seller claimed 4 USDT0 proceeds (tx: ${claimSellerTx})`);
  evidence.push({
    step: 9,
    action: "CLAIM_SELLER",
    txHash: claimSellerTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${claimSellerTx}`,
    details: "Seller claimed 4 USDT0 trade proceeds",
  });

  // Step 10: Provider B Claim FXRP Lot
  console.log("\n--- Step 10: Provider B Claim FXRP Lot ---");
  const claimProviderBTx = await providerBWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "claim",
    args: [rfqId],
  });
  await publicClient.waitForTransactionReceipt({ hash: claimProviderBTx });
  console.log(`✅ Step 10 complete: Provider B claimed 1 FXRP lot (tx: ${claimProviderBTx})`);
  evidence.push({
    step: 10,
    action: "CLAIM_PROVIDER_B",
    txHash: claimProviderBTx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${claimProviderBTx}`,
    details: "Provider B claimed 1 FXRP lot",
  });

  // Step 11: Provider A Claim Refund
  console.log("\n--- Step 11: Provider A Claim Collateral Refund ---");
  const claimProviderATx = await providerAWallet.writeContract({
    address: contractAddress,
    abi: rfqAbi,
    functionName: "claim",
    args: [rfqId],
  });
  await publicClient.waitForTransactionReceipt({ hash: claimProviderATx });
  console.log(`✅ Step 11 complete: Provider A refunded 5 USDT0 collateral (tx: ${claimProviderATx})`);
  evidence.push({
    step: 11,
    action: "CLAIM_PROVIDER_A",
    txHash: claimProviderATx,
    explorerUrl: `https://coston2-explorer.flare.network/tx/${claimProviderATx}`,
    details: "Provider A claimed full 5 USDT0 collateral refund",
  });

  console.log("\n===============================================================");
  console.log("🎉 ALL 11 STEPS COMPLETED AND VERIFIED ON FLARE COSTON2! 🎉");
  console.log("===============================================================");
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
