export class HushFlowCryptoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HushFlowCryptoError";
  }
}
