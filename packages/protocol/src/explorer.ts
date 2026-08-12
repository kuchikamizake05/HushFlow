import { getAddress } from "viem";

import { parseAmount } from "./amounts.js";

export const COSTON2_EXPLORER_URL =
  "https://coston2-explorer.flare.network" as const;

const transactionHashPattern = /^0x[0-9a-fA-F]{64}$/;

export function getCoston2AddressUrl(address: string): string {
  return `${COSTON2_EXPLORER_URL}/address/${getAddress(address)}`;
}

export function getCoston2TransactionUrl(transactionHash: string): string {
  if (!transactionHashPattern.test(transactionHash)) {
    throw new Error("TRANSACTION_HASH_INVALID");
  }
  return `${COSTON2_EXPLORER_URL}/tx/${transactionHash.toLowerCase()}`;
}

export function getCoston2BlockUrl(block: string | bigint): string {
  const value = typeof block === "bigint" ? block : parseAmount(block);
  if (value < 0n) throw new Error("BLOCK_INVALID");
  return `${COSTON2_EXPLORER_URL}/block/${value}`;
}
