import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const runAccessPreflight = (overrides: Record<string, string> = {}) => {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    FCC_INDEXER_DB_HOST: "34.38.42.208",
    FCC_INDEXER_DB_PORT: "3306",
    FCC_INDEXER_DB_NAME: "indexer",
    FCC_INDEXER_DB_USER: "hackathon_user_58",
    FCC_INDEXER_DB_PASSWORD: "secret-password",
    FCC_EXT_PROXY_URL: "https://fcc.hushflow.dev",
    ...overrides,
  };
  const keys = [
    "FCC_INDEXER_DB_HOST",
    "FCC_INDEXER_DB_PORT",
    "FCC_INDEXER_DB_NAME",
    "FCC_INDEXER_DB_USER",
    "FCC_INDEXER_DB_PASSWORD",
    "FCC_EXT_PROXY_URL",
    ...Object.keys(overrides),
  ];
  env.WSLENV = keys.join(":");
  return spawnSync("bash", ["scripts/setup/check-fcc-access.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
  });
};

describe("FCC access preflight", () => {
  it("passes when all 6 required variables are configured without requiring NGROK_AUTHTOKEN", () => {
    const result = runAccessPreflight();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SET     FCC_EXT_PROXY_URL");
    expect(result.stdout).toContain("PASS    FCC extension proxy URL is configured");
    expect(result.stdout).not.toContain("NGROK_AUTHTOKEN");
  });

  it("fails when any required variable is missing", () => {
    const result = runAccessPreflight({ FCC_EXT_PROXY_URL: "" });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("MISSING FCC_EXT_PROXY_URL");
  });

  it("fails when proxy URL has invalid scheme", () => {
    const result = runAccessPreflight({ FCC_EXT_PROXY_URL: "ftp://fcc.hushflow.dev" });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL    FCC extension proxy URL must start with http:// or https://");
  });
});
