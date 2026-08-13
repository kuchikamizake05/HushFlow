import type { DataProvenance } from "./contracts.js";

const provenance: DataProvenance = {
  mode: "fixture",
  sourceId: "m4b-local-v1",
};

export const fixtureReadModel = {
  metadata: (): DataProvenance => provenance,
};
