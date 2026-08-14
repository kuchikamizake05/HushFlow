import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const runPreflight = (overrides: Record<string, string> = {}) =>
  spawnSync("bash", ["scripts/setup/check-fcc-container-config.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      WSLENV: Object.keys(overrides).join(":"),
      ...overrides,
    },
  });

describe("M1 FCC container kit", () => {
  it("defaults to the reviewed official source pin", () => {
    const result = runPreflight();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("MODE    official-source");
    expect(result.stdout).toContain("v0.0.24");
  });

  it("accepts a complete immutable image override", () => {
    const result = runPreflight({
      FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"a".repeat(64)}`,
      FCC_TEE_NODE_PIN_SOURCE: "https://example.invalid/official-pin-record",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("MODE    digest-image");
  });

  it.each([
    [{ FCC_TEE_NODE_IMAGE: "registry.example/tee-node:latest" }],
    [
      {
        FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"A".repeat(64)}`,
        FCC_TEE_NODE_PIN_SOURCE: "https://example.invalid/official-pin-record",
      },
    ],
    [
      {
        FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"a".repeat(63)}`,
        FCC_TEE_NODE_PIN_SOURCE: "https://example.invalid/official-pin-record",
      },
    ],
    [
      {
        FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"a".repeat(64)}`,
      },
    ],
    [{ FCC_TEE_NODE_PIN_SOURCE: "https://example.invalid/stray-pin" }],
  ])("rejects incomplete or unsafe image configuration %#", (environment) => {
    expect(runPreflight(environment).status).toBe(1);
  });

  it("pins official source identity and keeps both modes private", async () => {
    const [dockerfile, sourceCompose, imageCompose, extensionDockerfile] =
      await Promise.all([
        readFile("infra/fcc/tee-node.Dockerfile", "utf8"),
        readFile("infra/fcc/docker-compose.template.yml", "utf8"),
        readFile("infra/fcc/docker-compose.image.template.yml", "utf8"),
        readFile("services/fcc-extension/Dockerfile", "utf8"),
      ]);

    expect(dockerfile).toContain("v0.0.24");
    expect(dockerfile).toContain("adc67a29eb7162f6f1b5dabcbca320009480695e");
    expect(dockerfile).toContain(
      "https://github.com/flare-foundation/tee-node.git",
    );
    expect(sourceCompose).toContain(
      "dockerfile: infra/fcc/tee-node.Dockerfile",
    );
    expect(imageCompose).toContain("FCC_TEE_NODE_IMAGE");
    expect(sourceCompose).toContain("network_mode: service:tee-node");
    expect(imageCompose).toContain("network_mode: service:tee-node");
    expect(sourceCompose).not.toMatch(/^\s*ports:/m);
    expect(imageCompose).not.toMatch(/^\s*ports:/m);
    expect(extensionDockerfile).toContain("EXTENSION_PORT=7702");
    expect(extensionDockerfile).toContain("SIGN_PORT=7701");
  });
});
