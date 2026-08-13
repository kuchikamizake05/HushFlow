import { operationalDrills } from "./operational-drills.js";

process.stdout.write(
  `${JSON.stringify(
    {
      classification: "CONTROLLED_TESTNET_ACTIVITY",
      mode: "LOCAL_DRILL_PLAN_ONLY",
      drills: operationalDrills,
    },
    null,
    2,
  )}\n`,
);
