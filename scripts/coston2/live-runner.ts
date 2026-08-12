import type { LiveActionKind, LiveScenarioPlan } from "./live-plan.js";

type TransactionHash = `0x${string}`;

export type ScenarioEvidence = Readonly<{
  action: LiveActionKind;
  transactionHash: TransactionHash;
}>;

export type ScenarioActionExecutor = (
  action: Readonly<{ kind: LiveActionKind }>,
) => Promise<TransactionHash>;

const isTransactionHash = (value: string): value is TransactionHash =>
  /^0x[0-9a-fA-F]{64}$/.test(value);

export const executeLiveScenario = async (
  plan: LiveScenarioPlan,
  executeAction: ScenarioActionExecutor,
): Promise<readonly ScenarioEvidence[]> => {
  const evidence: ScenarioEvidence[] = [];

  for (const action of plan.actions) {
    try {
      const transactionHash = await executeAction(action);
      if (!isTransactionHash(transactionHash)) {
        throw new Error("INVALID_TRANSACTION_HASH");
      }
      evidence.push({ action: action.kind, transactionHash });
    } catch (error) {
      throw new Error(`SCENARIO_ACTION_FAILED:${action.kind}`, {
        cause: error,
      });
    }
  }

  return evidence;
};
