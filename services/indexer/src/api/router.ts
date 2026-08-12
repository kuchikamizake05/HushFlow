import { getAddress } from "viem";
import { z } from "zod";

import { rfqStatuses, type RfqStatus } from "@hushflow/protocol/constants";
import type { DeploymentManifest } from "@hushflow/protocol/deployment";
import { deploymentStatusDtoSchema } from "@hushflow/protocol/read-api";

import { ReadRepositoryError, type ListRfqInput } from "./repository.js";

export interface ReadApiRepository {
  listRfqs(input: ListRfqInput): Promise<unknown>;
  getRfqDetail(rfqId: string): Promise<unknown | null>;
  getRfqProof(rfqId: string): Promise<unknown | null>;
  getPortfolio(account: string): Promise<unknown>;
  getStats(): Promise<unknown>;
  getHealth(): Promise<unknown>;
}

class RequestError extends Error {}

const rfqIdSchema = z.string().regex(/^[1-9][0-9]*$/);
const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value));

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function parseRfqId(value: string): string {
  const result = rfqIdSchema.safeParse(value);
  if (!result.success) throw new RequestError();
  return result.data;
}

function parseAddress(value: string): string {
  const result = addressSchema.safeParse(value);
  if (!result.success) throw new RequestError();
  return result.data;
}

function parseListInput(url: URL): ListRfqInput {
  const allowed = new Set(["limit", "cursor", "status", "seller", "provider"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) {
      throw new RequestError();
    }
  }
  const limitText = url.searchParams.get("limit") ?? "20";
  if (!/^[1-9][0-9]*$/.test(limitText)) throw new RequestError();
  const limit = Number(limitText);
  if (!Number.isSafeInteger(limit) || limit > 100) throw new RequestError();

  const statusText = url.searchParams.get("status");
  if (statusText && !rfqStatuses.includes(statusText as RfqStatus)) {
    throw new RequestError();
  }
  const cursor = url.searchParams.get("cursor");
  if (cursor !== null && (cursor.length === 0 || cursor.length > 512)) {
    throw new RequestError();
  }
  const seller = url.searchParams.get("seller");
  const provider = url.searchParams.get("provider");
  return {
    limit,
    ...(cursor ? { cursor } : {}),
    ...(statusText ? { status: statusText as RfqStatus } : {}),
    ...(seller ? { seller: parseAddress(seller) } : {}),
    ...(provider ? { provider: parseAddress(provider) } : {}),
  };
}

function deploymentView(deployment: DeploymentManifest) {
  if (deployment.status === "pending") {
    return deploymentStatusDtoSchema.parse({
      schemaVersion: 1,
      network: deployment.network,
      chainId: deployment.chainId,
      status: deployment.status,
      blockingReason: deployment.blockingReason,
      updatedAt: deployment.generatedAt,
    });
  }
  return deploymentStatusDtoSchema.parse({
    schemaVersion: 1,
    network: deployment.network,
    chainId: deployment.chainId,
    status: deployment.status,
    hushFlowRfq: deployment.hushFlowRfq,
    deploymentTransactionHash: deployment.deploymentTransactionHash,
    deploymentBlock: deployment.deploymentBlock.toString(),
    updatedAt: deployment.generatedAt,
  });
}

async function route(
  request: Request,
  repository: ReadApiRepository,
  deployment: DeploymentManifest,
): Promise<Response> {
  if (request.method !== "GET") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/deployment") return json(200, deploymentView(deployment));
  if (path === "/health") return json(200, await repository.getHealth());
  if (path === "/stats") return json(200, await repository.getStats());
  if (path === "/rfqs") {
    return json(200, await repository.listRfqs(parseListInput(url)));
  }

  const proof = /^\/rfqs\/([^/]+)\/proof$/.exec(path);
  if (proof) {
    const value = await repository.getRfqProof(parseRfqId(proof[1]!));
    return value ? json(200, value) : json(404, { error: "NOT_FOUND" });
  }
  const detail = /^\/rfqs\/([^/]+)$/.exec(path);
  if (detail) {
    const value = await repository.getRfqDetail(parseRfqId(detail[1]!));
    return value ? json(200, value) : json(404, { error: "NOT_FOUND" });
  }
  const portfolio = /^\/wallets\/([^/]+)\/portfolio$/.exec(path);
  if (portfolio) {
    return json(
      200,
      await repository.getPortfolio(parseAddress(portfolio[1]!)),
    );
  }
  return json(404, { error: "NOT_FOUND" });
}

export function createReadApiHandler(
  repository: ReadApiRepository,
  deployment: DeploymentManifest,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return await route(request, repository, deployment);
    } catch (error) {
      if (error instanceof RequestError) {
        return json(400, { error: "REQUEST_INVALID" });
      }
      if (
        error instanceof ReadRepositoryError &&
        error.code === "DEPLOYMENT_NOT_LIVE"
      ) {
        return json(503, { error: "DEPLOYMENT_NOT_LIVE" });
      }
      return json(500, { error: "INTERNAL_ERROR" });
    }
  };
}
