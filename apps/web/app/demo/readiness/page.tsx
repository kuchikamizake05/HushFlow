import { coston2Deployment } from "@hushflow/protocol/deployments/coston2";
import {
  buildDemoReadiness,
  demoRequirementNames,
} from "../../../../../scripts/coston2/demo-readiness";
import { DemoReadiness } from "../../../src/demo/demo-readiness";
import { toDemoReadinessView } from "../../../src/demo/readiness";
import { RfqRouteShell } from "../../../src/rfq/route-shell";

const hasIndexerAccess = Boolean(
  process.env.FCC_INDEXER_DB_HOST &&
    process.env.FCC_INDEXER_DB_PORT &&
    process.env.FCC_INDEXER_DB_NAME &&
    process.env.FCC_INDEXER_DB_USER &&
    process.env.FCC_INDEXER_DB_PASSWORD,
);

const requirementPresence = Object.fromEntries(
  demoRequirementNames.map((name) => [
    name,
    name === "FCC_INDEXER_ACCESS"
      ? hasIndexerAccess
      : Boolean(process.env[name]),
  ]),
);

export default function DemoReadinessPage() {
  const readiness = buildDemoReadiness({
    deployment: coston2Deployment,
    seller: process.env.HUSHFLOW_SELLER_ADDRESS,
    providerA: process.env.HUSHFLOW_PROVIDER_A_ADDRESS,
    providerB: process.env.HUSHFLOW_PROVIDER_B_ADDRESS,
    requirements: requirementPresence,
  });

  return (
    <RfqRouteShell eyebrow="CONTROLLED TESTNET">
      <DemoReadiness readiness={toDemoReadinessView(readiness)} />
    </RfqRouteShell>
  );
}
