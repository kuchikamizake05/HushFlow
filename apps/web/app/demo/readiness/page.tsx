import { coston2Deployment } from "../../../../../packages/protocol/src/deployments/coston2";
import {
  buildDemoReadiness,
  demoRequirementNames,
} from "../../../../../scripts/coston2/demo-readiness";
import { DemoReadiness } from "../../../src/demo/demo-readiness";
import { toDemoReadinessView } from "../../../src/demo/readiness";
import { RfqRouteShell } from "../../../src/rfq/route-shell";

const requirementPresence = Object.fromEntries(
  demoRequirementNames.map((name) => [
    name,
    Boolean(
      process.env[name === "FCC_INDEXER_ACCESS" ? "FCC_INDEXER_DB_HOST" : name],
    ),
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
