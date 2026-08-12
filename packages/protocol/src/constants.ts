export const COSTON2_CHAIN_ID = 114 as const;
export const MAX_PROVIDERS = 20 as const;
export const MAX_CIPHERTEXT_BYTES = 4_096 as const;
export const MIN_QUOTE_DURATION_SECONDS = 60 as const;
export const MAX_QUOTE_DURATION_SECONDS = 86_400 as const;
export const RESOLUTION_DURATION_SECONDS = 1_800 as const;

export const payloadKinds = ["SELLER_MINIMUM", "PROVIDER_QUOTE"] as const;
export const resultTypes = ["TRADE", "NO_VALID_QUOTE", "INVALID_RFQ"] as const;
export const rfqStatuses = [
  "OPEN",
  "SETTLED",
  "NO_VALID_QUOTE",
  "INVALID_RFQ",
  "CANCELLED",
  "TIMED_OUT",
] as const;

export type PayloadKind = (typeof payloadKinds)[number];
export type ResultType = (typeof resultTypes)[number];
export type RfqStatus = (typeof rfqStatuses)[number];
