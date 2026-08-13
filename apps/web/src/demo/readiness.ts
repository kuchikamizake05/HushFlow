export type DemoReadinessView = Readonly<{
  heading: "CONTROLLED TESTNET ACTIVITY";
  state: "READY_FOR_APPROVAL" | "BLOCKED" | "INVALID";
  reasons: readonly string[];
  requirements: readonly Readonly<{ name: string; present: boolean }>[];
  actions: readonly Readonly<{
    id: string;
    role: string;
    description: string;
  }>[];
}>;

export const toDemoReadinessView = (readiness: {
  state: DemoReadinessView["state"];
  reasons: readonly string[];
  requirements: DemoReadinessView["requirements"];
  actions: DemoReadinessView["actions"];
}): DemoReadinessView => ({
  heading: "CONTROLLED TESTNET ACTIVITY",
  state: readiness.state,
  reasons: readiness.reasons,
  requirements: readiness.requirements,
  actions: readiness.actions,
});
