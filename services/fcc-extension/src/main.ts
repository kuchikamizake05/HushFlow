import { pathToFileURL } from "node:url";

import { createFccHttpServer, type FccHttpServer } from "./http-runtime.js";
import { createResultNonce, createTeeDecryptEnvelope } from "./tee-crypto.js";

export interface RuntimeConfig {
  extensionPort: number;
  signPort: number;
}

export function readRuntimeConfig(
  environment: Record<string, string | undefined>,
): RuntimeConfig {
  return {
    extensionPort: parsePort(
      environment.EXTENSION_PORT,
      7702,
      "EXTENSION_PORT_INVALID",
    ),
    signPort: parsePort(environment.SIGN_PORT, 7701, "SIGN_PORT_INVALID"),
  };
}

export async function startRuntime(
  environment: Record<string, string | undefined> = process.env,
): Promise<FccHttpServer> {
  const config = readRuntimeConfig(environment);
  const server = createFccHttpServer({
    decryptEnvelope: createTeeDecryptEnvelope(config.signPort),
    createResultNonce,
  });
  await server.listen(config.extensionPort, "0.0.0.0");
  return server;
}

function parsePort(
  rawValue: string | undefined,
  defaultValue: number,
  errorCode: string,
): number {
  const value = rawValue === undefined ? defaultValue : Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(errorCode);
  }
  return value;
}

async function run(): Promise<void> {
  const server = await startRuntime();
  let closing = false;
  const close = (): void => {
    if (closing) return;
    closing = true;
    void server.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  void run().catch(() => {
    process.exitCode = 1;
  });
}
