import { coston2Deployment } from "../../packages/protocol/src/deployments/coston2.js";

import {
  buildDemoReadiness,
  demoRequirementNames,
  type DemoReadiness,
} from "./demo-readiness.js";

export const indexerDbFields = [
  "FCC_INDEXER_DB_HOST",
  "FCC_INDEXER_DB_PORT",
  "FCC_INDEXER_DB_NAME",
  "FCC_INDEXER_DB_USER",
  "FCC_INDEXER_DB_PASSWORD",
] as const;

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
    const missingIndexer = indexerDbFields.filter(
      (field) => !environment[field],
    );
    const hasIndexerAccess = missingIndexer.length === 0;

    const baseReadiness = buildDemoReadiness({
      deployment: coston2Deployment,
      seller: environment.HUSHFLOW_SELLER_ADDRESS,
      providerA: environment.HUSHFLOW_PROVIDER_A_ADDRESS,
      providerB: environment.HUSHFLOW_PROVIDER_B_ADDRESS,
      requirements: Object.fromEntries(
        demoRequirementNames.map((name) => [
          name,
          name === "FCC_INDEXER_ACCESS"
            ? hasIndexerAccess
            : Boolean(environment[name]),
        ]),
      ),
    });

    if (!hasIndexerAccess) {
      const additionalReasons = missingIndexer.map(
        (field) => `MISSING:${field}`,
      );
      return {
        ...baseReadiness,
        reasons: Array.from(
          new Set([...baseReadiness.reasons, ...additionalReasons]),
        ),
      };
    }

    return baseReadiness;
  } catch {
    return invalidReport("DEMO_READINESS_INVALID");
  }
};

