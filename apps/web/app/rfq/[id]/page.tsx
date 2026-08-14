import { RfqRouteShell } from "../../../src/rfq/route-shell";

export function generateStaticParams() {
  return [{ id: "0042" }, { id: "1" }];
}

export default async function RfqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RfqRouteShell eyebrow={`RFQ #${id}`}>
      <p>
        Detail evidence is unavailable until a validated read model is
        connected.
      </p>
    </RfqRouteShell>
  );
}

