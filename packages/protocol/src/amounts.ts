const UINT256_MAX = (1n << 256n) - 1n;
const CANONICAL_AMOUNT = /^(0|[1-9][0-9]*)$/;

export function parseAmount(value: string): bigint {
  if (typeof value !== "string" || !CANONICAL_AMOUNT.test(value)) {
    throw new Error("AMOUNT_INVALID");
  }

  const amount = BigInt(value);
  if (amount > UINT256_MAX) {
    throw new Error("AMOUNT_INVALID");
  }
  return amount;
}

export function formatAmount(value: bigint): string {
  if (typeof value !== "bigint" || value < 0n || value > UINT256_MAX) {
    throw new Error("AMOUNT_INVALID");
  }
  return value.toString();
}
