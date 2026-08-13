export type RfqStatus =
  | "OPEN"
  | "SETTLED"
  | "NO_VALID_QUOTE"
  | "INVALID_RFQ"
  | "CANCELLED"
  | "TIMED_OUT";

export type PresentationState = {
  title: string;
  description: string;
  writeAllowed: false;
};

const states: Record<RfqStatus, PresentationState> = {
  OPEN: {
    title: "Quoting window open",
    description:
      "Public RFQ details are visible. A fresh live preflight is required before any quote.",
    writeAllowed: false,
  },
  SETTLED: {
    title: "Settlement available",
    description:
      "Outcome is indexed. Claim readiness must be checked directly onchain.",
    writeAllowed: false,
  },
  NO_VALID_QUOTE: {
    title: "No valid quote",
    description: "The RFQ closed without an eligible result.",
    writeAllowed: false,
  },
  INVALID_RFQ: {
    title: "RFQ invalid",
    description:
      "The instruction was rejected. No action can be inferred from indexed data.",
    writeAllowed: false,
  },
  CANCELLED: {
    title: "RFQ cancelled",
    description: "The seller cancelled this instruction.",
    writeAllowed: false,
  },
  TIMED_OUT: {
    title: "RFQ timed out",
    description:
      "The resolution window elapsed. Eligibility needs a fresh contract read.",
    writeAllowed: false,
  },
};

export function derivePresentationState(status: RfqStatus): PresentationState {
  return states[status];
}
