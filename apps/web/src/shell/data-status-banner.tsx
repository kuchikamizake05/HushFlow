import type { DataProvenance } from "../adapters/contracts";

export function DataStatusBanner({
  provenance,
}: {
  provenance: DataProvenance;
}) {
  if (provenance.mode === "fixture") {
    return (
      <p className="data-status data-status--fixture" role="status">
        Local fixture data
      </p>
    );
  }

  return (
    <p className="data-status" role="status">
      Live indexed data
    </p>
  );
}
