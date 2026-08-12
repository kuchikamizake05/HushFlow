import { buildLiveScenarioPlan, parseDeploymentConfig } from "./live-plan.js";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`LIVE_ENV_MISSING:${name}`);
  return value;
};

const deployment = parseDeploymentConfig(process.env);
const scenario = buildLiveScenarioPlan({
  contractAddress: required("HUSHFLOW_CONTRACT_ADDRESS"),
  seller: required("HUSHFLOW_SELLER_ADDRESS"),
  providerA: required("HUSHFLOW_PROVIDER_A_ADDRESS"),
  providerB: required("HUSHFLOW_PROVIDER_B_ADDRESS"),
  lotAmount: BigInt(required("HUSHFLOW_LOT_AMOUNT")),
  quoteCap: BigInt(required("HUSHFLOW_QUOTE_CAP")),
});

const publicPlan = {
  deployment,
  scenario,
  safety: deployment.broadcastApproved
    ? "APPROVAL_RECORDED_BUT_NO_BROADCAST_PERFORMED"
    : "DRY_RUN_ONLY",
};

process.stdout.write(
  `${JSON.stringify(
    publicPlan,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  )}\n`,
);
