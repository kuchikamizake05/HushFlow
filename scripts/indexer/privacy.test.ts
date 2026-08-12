import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { publicErrorCode } from "../../services/indexer/src/error-code.js";

const sourceFiles = [
  "services/indexer/src/api/router.ts",
  "services/indexer/src/api/server.ts",
  "services/indexer/src/db/store.ts",
  "services/indexer/src/worker/run.ts",
  "services/indexer/src/api/main.ts",
  "services/indexer/src/worker/main.ts",
];

describe("M4A privacy boundaries", () => {
  it("never returns arbitrary error codes or messages", () => {
    expect(
      publicErrorCode(
        { code: "PRIVATE_MARKER_42 postgresql://secret-host" },
        "SAFE_FALLBACK",
      ),
    ).toBe("SAFE_FALLBACK");
    expect(
      publicErrorCode(new Error("PRIVATE_MARKER_42"), "SAFE_FALLBACK"),
    ).toBe("SAFE_FALLBACK");
    expect(publicErrorCode({ code: "RPC_UNAVAILABLE" }, "SAFE_FALLBACK")).toBe(
      "RPC_UNAVAILABLE",
    );
  });

  it("keeps forbidden plaintext and secret identifiers out of production storage", async () => {
    const migration = (
      await readFile("services/indexer/migrations/001_initial.sql", "utf8")
    ).toLowerCase();

    for (const forbidden of [
      "seller_minimum",
      "plaintext_quote",
      "decrypted_input",
      "private_key",
      "database_password",
      "tunnel_token",
    ]) {
      expect(migration).not.toContain(forbidden);
    }
  });

  it("does not log dynamic exceptions, event payloads, or database URLs", async () => {
    const source = (
      await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))
    ).join("\n");

    expect(source).not.toMatch(/console\.(log|error|warn)/);
    expect(source).not.toMatch(/JSON\.stringify\(error/);
    expect(source).not.toMatch(
      /process\.stderr\.write\([^)]*error\.(message|stack)/s,
    );
    expect(source).not.toContain("DATABASE_URL=");
    expect(source).not.toContain("PRIVATE_MARKER_42");
  });
});
