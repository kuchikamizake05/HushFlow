import type { DataProvenance } from "./contracts";

const provenance: DataProvenance = {
  mode: "fixture",
  sourceId: "m4b-local-v1",
};

export const fixtureReadModel = {
  metadata: (): DataProvenance => provenance,
};
