import { getAddress, type Address } from "viem";

export const demoRequirementNames = [
  "COSTON2_RPC_URL",
  "FCC_INDEXER_ACCESS",
  "FCC_EXT_PROXY_URL",
  "FCC_TEE_EXTENSION_REGISTRY",
  "FCC_TEE_MACHINE_REGISTRY",
  "FCC_TEE_SIGNER",
] as const;

type DemoRequirementName = (typeof demoRequirementNames)[number];

export type DemoActionId =
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

export type DemoReadiness = Readonly<{
  classification: "CONTROLLED_TESTNET_ACTIVITY";
  state: "READY_FOR_APPROVAL" | "BLOCKED" | "INVALID";
  reasons: readonly string[];
  requirements: readonly Readonly<{
    name: DemoRequirementName;
    present: boolean;
  }>[];
  wallets: Readonly<{ seller: Address; providerA: Address; providerB: Address }> | null;
  actions: readonly Readonly<{ id: DemoActionId; role: string; description: string }>[];
}>;

export type DemoReadinessInput = Readonly<{
  deployment: Readonly<{
    status: "pending" | "live";
    blockingReason?: string;
  }>;
  seller?: string;
  providerA?: string;
  providerB?: string;
  requirements: Partial<Record<DemoRequirementName, boolean>>;
  [ignored: string]: unknown;
}>;

const actions: DemoReadiness["actions"] = [
  { id: "APPROVE_FXRP", role: "seller", description: "Approve FXRP custody." },
  { id: "CREATE_RFQ", role: "seller", description: "Create the controlled RFQ." },
  { id: "APPROVE_USDT0_A", role: "provider-a", description: "Approve USDT0 collateral." },
  { id: "SUBMIT_QUOTE_A", role: "provider-a", description: "Submit an encrypted quote." },
  { id: "APPROVE_USDT0_B", role: "provider-b", description: "Approve USDT0 collateral." },
  { id: "SUBMIT_QUOTE_B", role: "provider-b", description: "Submit an encrypted quote." },
  { id: "REQUEST_RESOLUTION", role: "requester", description: "Request FCC resolution." },
  { id: "SUBMIT_RESULT", role: "requester", description: "Relay the FCC result." },
  { id: "CLAIM_SELLER", role: "seller", description: "Claim the seller entitlement." },
  { id: "CLAIM_PROVIDER_A", role: "provider-a", description: "Claim provider A entitlement." },
  { id: "CLAIM_PROVIDER_B", role: "provider-b", description: "Claim provider B entitlement." },
];

const publicRequirements = (input: DemoReadinessInput) =>
  demoRequirementNames.map((name) => ({
    name,
    present: input.requirements[name] === true,
  }));

const invalid = (
  reasons: readonly string[],
  requirements: DemoReadiness["requirements"],
): DemoReadiness => ({
  classification: "CONTROLLED_TESTNET_ACTIVITY",
  state: "INVALID",
  reasons,
  requirements,
  wallets: null,
  actions,
});

const blocked = (
  reasons: readonly string[],
  requirements: DemoReadiness["requirements"],
): DemoReadiness => ({
  classification: "CONTROLLED_TESTNET_ACTIVITY",
  state: "BLOCKED",
  reasons,
  requirements,
  wallets: null,
  actions,
});

export const buildDemoReadiness = (input: DemoReadinessInput): DemoReadiness => {
  const requirements = publicRequirements(input);
  let seller: Address;
  let providerA: Address;
  let providerB: Address;

  const suppliedWallets = [input.seller, input.providerA, input.providerB];
  const hasInvalidWallet = suppliedWallets.some((wallet) => {
    if (!wallet) return false;
    try {
      getAddress(wallet);
      return false;
    } catch {
      return true;
    }
  });

  if (hasInvalidWallet) {
    return invalid(["SCENARIO_WALLET_INVALID"], requirements);
  }

  const missingWallets = [
    ["HUSHFLOW_SELLER_ADDRESS", input.seller],
    ["HUSHFLOW_PROVIDER_A_ADDRESS", input.providerA],
    ["HUSHFLOW_PROVIDER_B_ADDRESS", input.providerB],
  ].flatMap(([name, value]) => (value ? [] : [`MISSING:${name}`]));

  if (missingWallets.length > 0) {
    const reasons = [
      ...(input.deployment.status === "pending"
        ? [input.deployment.blockingReason ?? "DEPLOYMENT_PENDING"]
        : []),
      ...missingWallets,
      ...requirements
        .filter((requirement) => !requirement.present)
        .map((requirement) => `MISSING:${requirement.name}`),
    ];
    return blocked(reasons, requirements);
  }

  seller = getAddress(input.seller!);
  providerA = getAddress(input.providerA!);
  providerB = getAddress(input.providerB!);

  if (new Set([seller, providerA, providerB].map((wallet) => wallet.toLowerCase())).size !== 3) {
    return invalid(["SCENARIO_WALLETS_NOT_DISTINCT"], requirements);
  }

  const reasons: string[] = [];
  if (input.deployment.status === "pending") {
    reasons.push(input.deployment.blockingReason ?? "DEPLOYMENT_PENDING");
  }
  for (const requirement of requirements) {
    if (!requirement.present) reasons.push(`MISSING:${requirement.name}`);
  }

  return {
    classification: "CONTROLLED_TESTNET_ACTIVITY",
    state: reasons.length === 0 ? "READY_FOR_APPROVAL" : "BLOCKED",
    reasons,
    requirements,
    wallets: { seller, providerA, providerB },
    actions,
  };
};
