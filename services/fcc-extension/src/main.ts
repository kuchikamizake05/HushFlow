import { pathToFileURL } from "node:url";

import { Server } from "./base/server.js";
import {
  DEFAULT_EXTENSION_PORT,
  DEFAULT_SIGN_PORT,
  VERSION,
} from "./app/config.js";
import {
  createDefaultDependencies,
  register,
  reportState,
} from "./app/handlers.js";

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
      DEFAULT_EXTENSION_PORT,
      "EXTENSION_PORT_INVALID",
    ),
    signPort: parsePort(
      environment.SIGN_PORT,
      DEFAULT_SIGN_PORT,
      "SIGN_PORT_INVALID",
    ),
  };
}

export async function startRuntime(
  environment: Record<string, string | undefined> = process.env,
): Promise<Server> {
  const config = readRuntimeConfig(environment);
  const deps = createDefaultDependencies(config.signPort);
  const server = new Server(
    config.extensionPort,
    config.signPort,
    VERSION,
    (framework) => register(framework, deps),
    reportState,
  );
  await server.listenAndServe();
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
