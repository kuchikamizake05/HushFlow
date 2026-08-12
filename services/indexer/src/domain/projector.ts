import type { EventSource, ProjectorEvent } from "./events.js";

const ZERO_ADDRESS = `0x${"0".repeat(40)}`;

type RfqStatus =
  | "OPEN"
  | "SETTLED"
  | "NO_VALID_QUOTE"
  | "INVALID_RFQ"
  | "CANCELLED"
  | "TIMED_OUT";

interface RfqRow {
  rfqId: string;
  seller: string;
  lotAmount: string;
  quoteCap: string;
  quoteDeadline: string;
  resolutionDeadline: string;
  sellerCiphertext: string;
  status: RfqStatus;
  providerCount: number;
  actionId: string | null;
  winningProvider: string | null;
  winningQuote: string | null;
  source: EventSource;
}

interface ProviderRow {
  rfqId: string;
  provider: string;
  position: number;
  quoteCiphertext: string;
  submittedAtBlock: string;
  source: EventSource;
}

interface ActionRow {
  rfqId: string;
  actionId: string;
  status: "REQUESTED" | "RESOLVED";
  requestedAtBlock: string;
  source: EventSource;
}

interface OutcomeRow {
  rfqId: string;
  resultType: "TRADE" | "NO_VALID_QUOTE" | "INVALID_RFQ";
  winningProvider: string | null;
  winningQuote: string | null;
  resultNonce: string;
  source: EventSource;
}

interface ClaimRow {
  rfqId: string;
  account: string;
  fxrpAmount: string;
  usdt0Amount: string;
  claimed: true;
  source: EventSource;
}

export interface ProjectionState {
  readonly rfqs: Map<string, RfqRow>;
  readonly providers: Map<string, ProviderRow>;
  readonly actions: Map<string, ActionRow>;
  readonly outcomes: Map<string, OutcomeRow>;
  readonly claims: Map<string, ClaimRow>;
  readonly applied: Map<string, string>;
}

export class ProjectorError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ProjectorError";
    this.code = code;
  }
}

export function createProjection(): ProjectionState {
  return {
    rfqs: new Map(),
    providers: new Map(),
    actions: new Map(),
    outcomes: new Map(),
    claims: new Map(),
    applied: new Map(),
  };
}

function sourceKey(source: EventSource): string {
  return `${source.chainId}:${source.transactionHash}:${source.logIndex}`;
}

function requireOpenRfq(state: ProjectionState, rfqId: string): RfqRow {
  const rfq = state.rfqs.get(rfqId);
  if (!rfq) throw new ProjectorError("PROJECTOR_RFQ_NOT_FOUND");
  if (rfq.status !== "OPEN") {
    throw new ProjectorError("PROJECTOR_RFQ_NOT_OPEN");
  }
  return rfq;
}

function resultStatus(value: string): {
  status: RfqStatus;
  resultType: OutcomeRow["resultType"];
} {
  if (value === "1") return { status: "SETTLED", resultType: "TRADE" };
  if (value === "2") {
    return { status: "NO_VALID_QUOTE", resultType: "NO_VALID_QUOTE" };
  }
  if (value === "3") {
    return { status: "INVALID_RFQ", resultType: "INVALID_RFQ" };
  }
  throw new ProjectorError("PROJECTOR_RESULT_STATUS_INVALID");
}

export function applyProjectorEvent(
  state: ProjectionState,
  event: ProjectorEvent,
): void {
  const key = sourceKey(event.source);
  const fingerprint = JSON.stringify(event);
  const existing = state.applied.get(key);
  if (existing) {
    if (existing !== fingerprint) {
      throw new ProjectorError("PROJECTOR_SOURCE_CONFLICT");
    }
    return;
  }

  switch (event.eventName) {
    case "RfqCreated": {
      if (state.rfqs.has(event.rfqId)) {
        throw new ProjectorError("PROJECTOR_RFQ_DUPLICATE");
      }
      state.rfqs.set(event.rfqId, {
        rfqId: event.rfqId,
        seller: event.seller,
        lotAmount: event.lotAmount,
        quoteCap: event.quoteCap,
        quoteDeadline: event.quoteDeadline,
        resolutionDeadline: event.resolutionDeadline,
        sellerCiphertext: event.sellerCiphertext,
        status: "OPEN",
        providerCount: 0,
        actionId: null,
        winningProvider: null,
        winningQuote: null,
        source: event.source,
      });
      break;
    }
    case "QuoteSubmitted": {
      const rfq = requireOpenRfq(state, event.rfqId);
      const providerKey = `${event.rfqId}:${event.provider}`;
      if (state.providers.has(providerKey)) {
        throw new ProjectorError("PROJECTOR_PROVIDER_DUPLICATE");
      }
      state.providers.set(providerKey, {
        rfqId: event.rfqId,
        provider: event.provider,
        position: rfq.providerCount,
        quoteCiphertext: event.ciphertext,
        submittedAtBlock: event.source.blockNumber,
        source: event.source,
      });
      rfq.providerCount += 1;
      break;
    }
    case "RfqCancelled": {
      const rfq = requireOpenRfq(state, event.rfqId);
      if (rfq.providerCount !== 0) {
        throw new ProjectorError("PROJECTOR_CANCEL_WITH_PROVIDERS");
      }
      rfq.status = "CANCELLED";
      break;
    }
    case "ResolutionRequested": {
      const rfq = requireOpenRfq(state, event.rfqId);
      if (rfq.actionId || state.actions.has(event.actionId)) {
        throw new ProjectorError("PROJECTOR_ACTION_DUPLICATE");
      }
      rfq.actionId = event.actionId;
      state.actions.set(event.actionId, {
        rfqId: event.rfqId,
        actionId: event.actionId,
        status: "REQUESTED",
        requestedAtBlock: event.source.blockNumber,
        source: event.source,
      });
      break;
    }
    case "RfqFinalized": {
      const rfq = requireOpenRfq(state, event.rfqId);
      if (!rfq.actionId) {
        throw new ProjectorError("PROJECTOR_ACTION_NOT_FOUND");
      }
      const action = state.actions.get(rfq.actionId);
      if (!action) throw new ProjectorError("PROJECTOR_ACTION_NOT_FOUND");
      const result = resultStatus(event.status);
      const trade = result.resultType === "TRADE";
      if (
        trade &&
        (!state.providers.has(`${event.rfqId}:${event.winningProvider}`) ||
          event.winningQuote === "0")
      ) {
        throw new ProjectorError("PROJECTOR_WINNER_INVALID");
      }
      if (
        !trade &&
        (event.winningProvider !== ZERO_ADDRESS || event.winningQuote !== "0")
      ) {
        throw new ProjectorError("PROJECTOR_EMPTY_WINNER_INVALID");
      }
      rfq.status = result.status;
      rfq.winningProvider = trade ? event.winningProvider : null;
      rfq.winningQuote = trade ? event.winningQuote : null;
      action.status = "RESOLVED";
      state.outcomes.set(event.rfqId, {
        rfqId: event.rfqId,
        resultType: result.resultType,
        winningProvider: rfq.winningProvider,
        winningQuote: rfq.winningQuote,
        resultNonce: event.resultNonce,
        source: event.source,
      });
      break;
    }
    case "RfqTimedOut": {
      const rfq = requireOpenRfq(state, event.rfqId);
      rfq.status = "TIMED_OUT";
      break;
    }
    case "Claimed": {
      const rfq = state.rfqs.get(event.rfqId);
      if (!rfq) throw new ProjectorError("PROJECTOR_RFQ_NOT_FOUND");
      if (rfq.status === "OPEN") {
        throw new ProjectorError("PROJECTOR_CLAIM_WHILE_OPEN");
      }
      const claimKey = `${event.rfqId}:${event.account}`;
      if (state.claims.has(claimKey)) {
        throw new ProjectorError("PROJECTOR_CLAIM_DUPLICATE");
      }
      state.claims.set(claimKey, {
        rfqId: event.rfqId,
        account: event.account,
        fxrpAmount: event.fxrpAmount,
        usdt0Amount: event.usdt0Amount,
        claimed: true,
        source: event.source,
      });
      break;
    }
  }

  state.applied.set(key, fingerprint);
}

function byRfqId<T extends { rfqId: string }>(left: T, right: T): number {
  return BigInt(left.rfqId) < BigInt(right.rfqId) ? -1 : 1;
}

function publicRow<T extends { source: EventSource }>(
  row: T,
): Omit<T, "source"> {
  const { source, ...value } = row;
  void source;
  return value;
}

export function snapshotProjection(state: ProjectionState) {
  return {
    rfqs: [...state.rfqs.values()].sort(byRfqId).map(publicRow),
    providers: [...state.providers.values()]
      .sort(
        (left, right) => byRfqId(left, right) || left.position - right.position,
      )
      .map(publicRow),
    actions: [...state.actions.values()].sort(byRfqId).map(publicRow),
    outcomes: [...state.outcomes.values()].sort(byRfqId).map(publicRow),
    claims: [...state.claims.values()]
      .sort(
        (left, right) =>
          byRfqId(left, right) || left.account.localeCompare(right.account),
      )
      .map(publicRow),
  };
}
