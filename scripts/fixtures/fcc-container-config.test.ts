import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("M1 FCC container kit", () => {
  it("requires an immutable organizer tee-node image and shares only the private sign namespace", async () => {
    const compose = await readFile(
      "infra/fcc/docker-compose.template.yml",
      "utf8",
    );

    expect(compose).toContain("FCC_TEE_NODE_IMAGE");
    expect(compose).toContain("network_mode: service:tee-node");
    expect(compose).not.toMatch(/^\s*ports:/m);
  });

  it("keeps the extension container and validation script pinned to the documented ports and digest guard", async () => {
    const [dockerfile, checker] = await Promise.all([
      readFile("services/fcc-extension/Dockerfile", "utf8"),
      readFile("scripts/setup/check-fcc-container-config.sh", "utf8"),
    ]);

    expect(dockerfile).toContain("EXTENSION_PORT=7702");
    expect(dockerfile).toContain("SIGN_PORT=7701");
    expect(checker).toContain("FCC_TEE_NODE_PIN_SOURCE");
    expect(checker).toContain("@sha256:[0-9a-f]{64}");
  });
});
