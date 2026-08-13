import { z } from "zod";

import {
  requireLiveDeployment,
  type DeploymentManifest,
  type LiveDeployment,
} from "@hushflow/protocol/deployment";

const databaseUrlSchema = z
  .string()
  .min(1)
  .refine((value) => /^postgres(?:ql)?:\/\//.test(value));

const integer = (minimum: number, maximum: number, fallback: number) =>
  z
    .string()
    .regex(/^[1-9][0-9]*$/)
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum))
    .default(fallback);

const environmentSchema = z.object({
  INDEXER_MODE: z.enum(["fixture", "live"]),
  INDEXER_FIXTURE_PATH: z.string().min(1).max(1_024).optional(),
  INDEXER_SOURCE_IDENTITY: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9._:/-]+$/),
  DATABASE_URL: databaseUrlSchema,
  INDEXER_API_PORT: integer(1, 65_535, 8_787),
  INDEXER_BATCH_SIZE: integer(1, 1_000, 250),
  INDEXER_FINALITY_WINDOW: integer(8, 4_096, 64),
  INDEXER_POLL_INTERVAL_MS: integer(1_000, 60_000, 3_000),
});

interface CommonIndexerConfig {
  databaseUrl: string;
  port: number;
  batchSize: number;
  finalityWindow: number;
  pollIntervalMs: number;
  sourceIdentity: string;
}

export interface FixtureIndexerConfig extends CommonIndexerConfig {
  mode: "fixture";
  fixturePath: string;
}

export interface LiveIndexerConfig extends CommonIndexerConfig {
  mode: "live";
  deployment: LiveDeployment;
}

export type IndexerConfig = FixtureIndexerConfig | LiveIndexerConfig;

export class IndexerConfigError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "IndexerConfigError";
    this.code = code;
  }
}

export function parseIndexerConfig(
  environment: Readonly<Record<string, string | undefined>>,
  deployment: DeploymentManifest,
): IndexerConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new IndexerConfigError("INDEXER_CONFIG_INVALID");
  }

  const value = result.data;
  const common: CommonIndexerConfig = {
    databaseUrl: value.DATABASE_URL,
    port: value.INDEXER_API_PORT,
    batchSize: value.INDEXER_BATCH_SIZE,
    finalityWindow: value.INDEXER_FINALITY_WINDOW,
    pollIntervalMs: value.INDEXER_POLL_INTERVAL_MS,
    sourceIdentity: value.INDEXER_SOURCE_IDENTITY,
  };

  if (value.INDEXER_MODE === "fixture") {
    if (!value.INDEXER_FIXTURE_PATH) {
      throw new IndexerConfigError("INDEXER_CONFIG_INVALID");
    }
    return {
      mode: "fixture",
      fixturePath: value.INDEXER_FIXTURE_PATH,
      ...common,
    };
  }

  try {
    return {
      mode: "live",
      ...common,
      deployment: requireLiveDeployment(deployment),
    };
  } catch {
    throw new IndexerConfigError("INDEXER_DEPLOYMENT_NOT_LIVE");
  }
}
