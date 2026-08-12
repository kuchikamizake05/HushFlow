import { getAddress, type Address } from "viem";

const COSTON2_CHAIN_ID = 114;

const requiredAddress = (
  environment: Record<string, string | undefined>,
  name: string,
): Address => {
  const value = environment[name];

  if (!value) {
    throw new Error("DEPLOYMENT_ADDRESS_MISSING");
  }

  try {
    return getAddress(value);
  } catch {
    throw new Error("DEPLOYMENT_ADDRESS_INVALID");
  }
};

export type DeploymentConfig = Readonly<{
  chainId: typeof COSTON2_CHAIN_ID;
  fxrpAddress: Address;
  usdt0Address: Address;
  teeExtensionRegistry: Address;
  teeMachineRegistry: Address;
  teeSigner: Address;
  broadcastApproved: boolean;
}>;

export const parseDeploymentConfig = (
  environment: Record<string, string | undefined>,
): DeploymentConfig => {
  if (environment.COSTON2_EXPECTED_CHAIN_ID !== String(COSTON2_CHAIN_ID)) {
    throw new Error("COSTON2_CHAIN_REQUIRED");
  }

  const broadcastValue = environment.HUSHFLOW_BROADCAST_APPROVED ?? "false";
  if (broadcastValue !== "true" && broadcastValue !== "false") {
    throw new Error("BROADCAST_APPROVAL_INVALID");
  }

  return {
    chainId: COSTON2_CHAIN_ID,
    fxrpAddress: requiredAddress(environment, "COSTON2_EXPECTED_FXRP"),
    usdt0Address: requiredAddress(environment, "COSTON2_EXPECTED_USDT0"),
    teeExtensionRegistry: requiredAddress(
      environment,
      "FCC_TEE_EXTENSION_REGISTRY",
    ),
    teeMachineRegistry: requiredAddress(
      environment,
      "FCC_TEE_MACHINE_REGISTRY",
    ),
    teeSigner: requiredAddress(environment, "FCC_TEE_SIGNER"),
    broadcastApproved: broadcastValue === "true",
  };
};

export type LiveActionKind =
  | "APPROVE_FXRP"
  | "CREATE_RFQ"
  | "APPROVE_USDT0_A"
  | "SUBMIT_QUOTE_A"
  | "APPROVE_USDT0_B"
  | "SUBMIT_QUOTE_B"
  | "REQUEST_RESOLUTION"
  | "SUBMIT_RESULT"
  | "CLAIM_SELLER"
  | "CLAIM_PROVIDER_A"
  | "CLAIM_PROVIDER_B";

export type LiveScenarioPlan = Readonly<{
  classification: "CONTROLLED_TESTNET_ACTIVITY";
  contractAddress: Address;
  seller: Address;
  providerA: Address;
  providerB: Address;
  lotAmount: bigint;
  quoteCap: bigint;
  actions: readonly Readonly<{ kind: LiveActionKind }>[];
}>;

export const buildLiveScenarioPlan = (input: {
  contractAddress: string;
  seller: string;
  providerA: string;
  providerB: string;
  lotAmount: bigint;
  quoteCap: bigint;
}): LiveScenarioPlan => {
  const contractAddress = getAddress(input.contractAddress);
  const seller = getAddress(input.seller);
  const providerA = getAddress(input.providerA);
  const providerB = getAddress(input.providerB);

  if (
    new Set([seller, providerA, providerB].map((value) => value.toLowerCase()))
      .size !== 3
  ) {
    throw new Error("SCENARIO_WALLETS_NOT_DISTINCT");
  }
  if (input.lotAmount <= 0n || input.quoteCap <= 0n) {
    throw new Error("SCENARIO_AMOUNT_INVALID");
  }

  return {
    classification: "CONTROLLED_TESTNET_ACTIVITY",
    contractAddress,
    seller,
    providerA,
    providerB,
    lotAmount: input.lotAmount,
    quoteCap: input.quoteCap,
    actions: [
      { kind: "APPROVE_FXRP" },
      { kind: "CREATE_RFQ" },
      { kind: "APPROVE_USDT0_A" },
      { kind: "SUBMIT_QUOTE_A" },
      { kind: "APPROVE_USDT0_B" },
      { kind: "SUBMIT_QUOTE_B" },
      { kind: "REQUEST_RESOLUTION" },
      { kind: "SUBMIT_RESULT" },
      { kind: "CLAIM_SELLER" },
      { kind: "CLAIM_PROVIDER_A" },
      { kind: "CLAIM_PROVIDER_B" },
    ],
  };
};
