export default async function RfqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <h1>RFQ {id}</h1>
    </main>
  );
}
