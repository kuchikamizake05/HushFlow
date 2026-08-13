import { coston2Deployment } from "../../packages/protocol/src/deployments/coston2.js";

import {
  buildDemoReadiness,
  demoRequirementNames,
  type DemoReadiness,
} from "./demo-readiness.js";

const invalidReport = (reason: string): DemoReadiness => ({
  classification: "CONTROLLED_TESTNET_ACTIVITY",
  state: "INVALID",
  reasons: [reason],
  requirements: [],
  wallets: null,
  actions: [],
});

export const buildDemoCliReport = (
  environment: NodeJS.ProcessEnv,
): DemoReadiness => {
  try {
    return buildDemoReadiness({
      deployment: coston2Deployment,
      seller: environment.HUSHFLOW_SELLER_ADDRESS,
      providerA: environment.HUSHFLOW_PROVIDER_A_ADDRESS,
      providerB: environment.HUSHFLOW_PROVIDER_B_ADDRESS,
      requirements: Object.fromEntries(
        demoRequirementNames.map((name) => [
          name,
          Boolean(
            environment[
              name === "FCC_INDEXER_ACCESS" ? "FCC_INDEXER_DB_HOST" : name
            ],
          ),
        ]),
      ),
    });
  } catch {
    return invalidReport("DEMO_READINESS_INVALID");
  }
};
