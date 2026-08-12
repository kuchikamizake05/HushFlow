export function publicErrorCode(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z][A-Z0-9_]{2,63}$/.test(error.code)
  ) {
    return error.code;
  }
  return fallback;
}
