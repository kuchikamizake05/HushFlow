import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { hexToString, stringToHex, type Hex } from "viem";

import {
  handleFccActionV1,
  OP_COMMAND_RESOLVE_RFQ,
  OP_TYPE_HUSHFLOW,
  type FccActionDependencies,
} from "./handle-action.js";

const VERSION = "0.1.0";
const MAX_ACTION_BODY_BYTES = 1_048_576;
const HEX_PATTERN = /^0x(?:[0-9a-fA-F]{2})*$/;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

interface WireActionData {
  id: Hex;
  type: string;
  submissionTag: string;
  message: Hex;
}

interface WireAction {
  data: WireActionData;
}

interface DataFixed {
  opType: Hex;
  opCommand: Hex;
  originalMessage: Hex;
}

interface WireActionResult {
  id: Hex;
  submissionTag: string;
  status: number;
  log: string;
  opType: Hex;
  opCommand: Hex;
  additionalResultStatus: Hex;
  version: string;
  data: Hex;
}

export interface FccHttpServer {
  address(): ReturnType<Server["address"]>;
  close(): Promise<void>;
  listen(port: number, host: string): Promise<void>;
}

export function createFccHttpServer(
  dependencies: FccActionDependencies,
): FccHttpServer {
  let processedActions = 0;
  let queue = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const server = createServer((request, response) => {
    void route(
      request,
      response,
      dependencies,
      enqueue,
      () => processedActions,
      () => {
        ++processedActions;
      },
    );
  });

  return {
    address: () => server.address(),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    listen: (port, host) =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      }),
  };
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: FccActionDependencies,
  enqueue: <T>(operation: () => Promise<T>) => Promise<T>,
  getProcessedActions: () => number,
  incrementProcessedActions: () => void,
): Promise<void> {
  const path = new URL(request.url ?? "/", "http://extension.local").pathname;

  if (path === "/action") {
    if (request.method !== "POST")
      return sendText(response, 405, "method not allowed");
    return processActionRequest(
      request,
      response,
      dependencies,
      enqueue,
      incrementProcessedActions,
    );
  }
  if (path === "/state") {
    if (request.method !== "GET")
      return sendText(response, 405, "method not allowed");
    const state = await enqueue(async () => ({
      processedActions: getProcessedActions(),
    }));
    return sendJson(response, 200, {
      stateVersion: stringToHex(VERSION, { size: 32 }),
      state,
    });
  }
  sendText(response, 404, "not found");
}

async function processActionRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: FccActionDependencies,
  enqueue: <T>(operation: () => Promise<T>) => Promise<T>,
  incrementProcessedActions: () => void,
): Promise<void> {
  let action: WireAction;
  let fixed: DataFixed;
  try {
    action = parseAction(JSON.parse(await readBody(request)));
    fixed = parseDataFixed(JSON.parse(hexToString(action.data.message)));
  } catch (error) {
    return sendText(response, 400, safeError(error));
  }

  const opType = decodeBytes32(fixed.opType);
  const opCommand = decodeBytes32(fixed.opCommand);
  if (opType !== OP_TYPE_HUSHFLOW || opCommand !== OP_COMMAND_RESOLVE_RFQ) {
    return sendText(
      response,
      501,
      `unsupported op type or command: ${opType}/${opCommand}`,
    );
  }

  const result = await enqueue(async (): Promise<WireActionResult> => {
    try {
      const data = await handleFccActionV1(
        { opType, opCommand, message: fixed.originalMessage },
        dependencies,
      );
      incrementProcessedActions();
      return actionResult(action, fixed, 1, "ok", data);
    } catch (error) {
      return actionResult(action, fixed, 0, `error: ${safeError(error)}`, "0x");
    }
  });

  sendJson(response, 200, result);
}

function actionResult(
  action: WireAction,
  fixed: DataFixed,
  status: number,
  log: string,
  data: Hex,
): WireActionResult {
  return {
    id: action.data.id,
    submissionTag: action.data.submissionTag,
    status,
    log,
    opType: fixed.opType,
    opCommand: fixed.opCommand,
    additionalResultStatus: "0x",
    version: VERSION,
    data,
  };
}

function parseAction(input: unknown): WireAction {
  if (!isRecord(input) || !isRecord(input.data))
    throw new Error("invalid action");
  const { id, type, submissionTag, message } = input.data;
  if (
    !isHash(id) ||
    typeof type !== "string" ||
    typeof submissionTag !== "string" ||
    !isHex(message)
  ) {
    throw new Error("invalid action data");
  }
  return { data: { id, type, submissionTag, message } };
}

function parseDataFixed(input: unknown): DataFixed {
  if (!isRecord(input)) throw new Error("invalid DataFixed");
  const { opType, opCommand, originalMessage } = input;
  if (!isHash(opType) || !isHash(opCommand) || !isHex(originalMessage)) {
    throw new Error("invalid DataFixed fields");
  }
  return { opType, opCommand, originalMessage };
}

function decodeBytes32(value: Hex): string {
  return hexToString(value, { size: 32 }).replace(/\0+$/u, "");
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_ACTION_BODY_BYTES) {
        reject(new Error("action body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

function sendText(
  response: ServerResponse,
  status: number,
  value: string,
): void {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(value);
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHex(value: unknown): value is Hex {
  return typeof value === "string" && HEX_PATTERN.test(value);
}

function isHash(value: unknown): value is Hex {
  return typeof value === "string" && HASH_PATTERN.test(value);
}
