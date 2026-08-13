# HushFlow Release Gates and FCC Source Pin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore every local release gate and add a fail-closed FCC container path that defaults to the official Flare `tee-node v0.0.24` source while retaining an immutable image override.

**Architecture:** Keep browser-bundled imports extensionless, exclude local `.claude/` state from repository-wide gates, and represent the two FCC pin modes with separate Compose templates. Source mode builds an official, commit-verified tee-node image locally; image mode accepts only a lowercase SHA-256 digest plus provenance.

**Tech Stack:** TypeScript 6, Vitest 4, Next.js 16/Turbopack, Bash, Docker Compose, multi-stage Docker builds, Go 1.25.1, Foundry, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-13-hushflow-release-gates-and-fcc-source-pin-design.md`

## Global Constraints

- Do not broadcast a Coston2 transaction, open a public tunnel, request faucet funds, or change credentials.
- Official source repository is fixed to `https://github.com/flare-foundation/tee-node.git`.
- Official source tag is fixed to `v0.0.24` and must resolve to `adc67a29eb7162f6f1b5dabcbca320009480695e`.
- Image overrides must end in `@sha256:` followed by exactly 64 lowercase hexadecimal characters.
- Never print credential values, private keys, or full environment contents.
- Preflight and Compose validation must not pull, build, or run containers.
- Use the pinned WSL toolchain from `scripts/setup/use-local-tools.sh` for final verification.
- Preserve the current pending deployment manifest and every signer, replay, binding, privacy, and write guard.

---

## File Structure

### Web release boundary

- `scripts/web/package-contract.test.ts`: regression assertions for browser-bundled local imports.
- `apps/web/src/adapters/m4a.ts`: M4A read adapter with an extensionless local import.
- `apps/web/src/adapters/fixture.ts`: fixture adapter with an extensionless local type import.
- `apps/web/src/shell/data-status-banner.tsx`: banner with an extensionless local type import.

### Repository verification boundary

- `scripts/fixtures/repository-boundaries.test.ts`: executable contract for local-state ignore rules.
- `.gitignore`: excludes `.claude/` from Git status and commits.
- `.prettierignore`: excludes `.claude/` from root formatting.
- `apps/web/app/globals.css`: tracked formatting drift only.
- `eslint.config.mjs`: tracked formatting drift only.

### FCC pin modes

- `infra/fcc/tee-node.Dockerfile`: official source builder and runnable tee-node image.
- `infra/fcc/docker-compose.template.yml`: default source-build mode.
- `infra/fcc/docker-compose.image.template.yml`: immutable external-image mode.
- `scripts/setup/check-fcc-container-config.sh`: mode selection and fail-closed validation.
- `scripts/setup/check-fcc-access.sh`: delegates tee-node validation without requiring an image in source mode.
- `scripts/fixtures/fcc-container-config.test.ts`: configuration, Dockerfile, and Compose regression coverage.

### Operator documentation

- `.env.example`: source-default and optional image-override fields.
- `README.md`: safe commands and two supported pin modes.
- `docs/runbooks/coston2-m1-live.md`: controlled build/preflight/Compose sequence.
- `docs/architecture/overview.md`: source/image container boundary.
- `docs/verification/m1-local-fcc-slice.md`: new local compatibility evidence without a live claim.
- `docs/submission/hackathon.md`: accurate release/live status.

---

### Task 1: Restore the M4B Production Build

**Files:**
- Modify: `scripts/web/package-contract.test.ts`
- Modify: `apps/web/src/adapters/m4a.ts:1-5`
- Modify: `apps/web/src/adapters/fixture.ts:1`
- Modify: `apps/web/src/shell/data-status-banner.tsx:1`

**Interfaces:**
- Consumes: Next.js bundler resolution from `apps/web/tsconfig.json`.
- Produces: extensionless browser-source imports and a regression test named `keeps browser-bundled local imports extensionless`.

- [ ] **Step 1: Add the failing import-boundary test**

Append this test inside `describe("M4B web package contract", ...)`:

```ts
it("keeps browser-bundled local imports extensionless", () => {
  const browserSources = [
    "apps/web/src/adapters/m4a.ts",
    "apps/web/src/adapters/fixture.ts",
    "apps/web/src/shell/data-status-banner.tsx",
  ];

  for (const sourcePath of browserSources) {
    const source = readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/from\s+["']\.\.?\/[^"']+\.js["']/);
  }
});
```

- [ ] **Step 2: Run RED and confirm the intended failure**

Run:

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm vitest run scripts/web/package-contract.test.ts"
```

Expected: the new test fails because all three source files contain local imports ending in `.js`; existing package-contract tests still pass.

- [ ] **Step 3: Commit the RED checkpoint**

```bash
git add scripts/web/package-contract.test.ts
git commit -m "test: reproduce M4B local import build regression"
```

- [ ] **Step 4: Apply the minimal import fix**

Use these exact import specifiers:

```ts
// apps/web/src/adapters/m4a.ts
} from "./contracts";

// apps/web/src/adapters/fixture.ts
import type { DataProvenance } from "./contracts";

// apps/web/src/shell/data-status-banner.tsx
import type { DataProvenance } from "../adapters/contracts";
```

- [ ] **Step 5: Run the targeted GREEN checks**

Run the package-contract test, web typecheck, and web production build:

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm vitest run scripts/web/package-contract.test.ts"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm --filter @hushflow/web typecheck"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm --filter @hushflow/web build"
```

Expected: all three commands exit zero and Next completes its optimized production build.

- [ ] **Step 6: Commit the GREEN checkpoint**

```bash
git add apps/web/src/adapters/m4a.ts apps/web/src/adapters/fixture.ts apps/web/src/shell/data-status-banner.tsx
git commit -m "fix: restore M4B production module resolution"
```

---

### Task 2: Isolate Local Worktree State from Root Gates

**Files:**
- Create: `scripts/fixtures/repository-boundaries.test.ts`
- Modify: `.gitignore`
- Modify: `.prettierignore`
- Modify: `apps/web/app/globals.css`
- Modify: `eslint.config.mjs`

**Interfaces:**
- Consumes: root Git and Prettier ignore files.
- Produces: a test named `excludes local Claude worktrees from Git and formatting gates` and clean formatting for tracked sources.

- [ ] **Step 1: Add the failing repository-boundary test**

Create `scripts/fixtures/repository-boundaries.test.ts`:

```ts
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("repository verification boundaries", () => {
  it("excludes local Claude worktrees from Git and formatting gates", async () => {
    const [gitignore, prettierignore] = await Promise.all([
      readFile(".gitignore", "utf8"),
      readFile(".prettierignore", "utf8"),
    ]);

    expect(gitignore.split(/\r?\n/)).toContain(".claude/");
    expect(prettierignore.split(/\r?\n/)).toContain(".claude/");
  });
});
```

- [ ] **Step 2: Run RED and confirm both ignore assertions fail**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm vitest run scripts/fixtures/repository-boundaries.test.ts"
```

Expected: FAIL because neither ignore file currently contains `.claude/`.

- [ ] **Step 3: Commit the RED checkpoint**

```bash
git add scripts/fixtures/repository-boundaries.test.ts
git commit -m "test: reproduce local worktree verification drift"
```

- [ ] **Step 4: Add the ignore boundary and format tracked drift**

Append this exact entry to both `.gitignore` and `.prettierignore`:

```text
.claude/
```

Then format only the tracked files previously reported by the gate:

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm exec prettier --write apps/web/app/globals.css eslint.config.mjs"
```

- [ ] **Step 5: Run GREEN checks without touching `.claude/`**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm vitest run scripts/fixtures/repository-boundaries.test.ts"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm format:check"
git check-ignore .claude/worktrees/m4b-frontend/apps/web/.next/build-manifest.json
git status --short
```

Expected: test and formatting pass; `git check-ignore` prints the `.claude/...` path; no file under `.claude/` appears in status or diff.

- [ ] **Step 6: Commit the GREEN checkpoint**

```bash
git add .gitignore .prettierignore apps/web/app/globals.css eslint.config.mjs
git commit -m "chore: isolate local worktrees from release gates"
```

---

### Task 3: Add Official Source and Immutable Image FCC Modes

**Files:**
- Create: `infra/fcc/tee-node.Dockerfile`
- Create: `infra/fcc/docker-compose.image.template.yml`
- Modify: `infra/fcc/docker-compose.template.yml`
- Modify: `scripts/setup/check-fcc-container-config.sh`
- Modify: `scripts/setup/check-fcc-access.sh`
- Modify: `scripts/fixtures/fcc-container-config.test.ts`

**Interfaces:**
- Consumes: optional `FCC_TEE_NODE_IMAGE` and `FCC_TEE_NODE_PIN_SOURCE` environment values.
- Produces: source mode when both values are empty; image mode when both are valid; exit code 1 for every incomplete or unsafe override.
- Produces: source Compose template `infra/fcc/docker-compose.template.yml` and image Compose template `infra/fcc/docker-compose.image.template.yml`.

- [ ] **Step 1: Replace the existing static tests with executable mode cases**

Add this helper to `scripts/fixtures/fcc-container-config.test.ts`:

```ts
import { spawnSync } from "node:child_process";

const runPreflight = (overrides: Record<string, string> = {}) =>
  spawnSync("bash", ["scripts/setup/check-fcc-container-config.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      ...overrides,
    },
  });
```

Add these mode tests:

```ts
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
  [{ FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"A".repeat(64)}` }],
  [{ FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"a".repeat(63)}` }],
  [{ FCC_TEE_NODE_IMAGE: `registry.example/tee-node@sha256:${"a".repeat(64)}` }],
  [{ FCC_TEE_NODE_PIN_SOURCE: "https://example.invalid/stray-pin" }],
])("rejects incomplete or unsafe image configuration %#", (environment) => {
  expect(runPreflight(environment).status).toBe(1);
});
```

Extend the file-content assertions to require:

```ts
expect(dockerfile).toContain("v0.0.24");
expect(dockerfile).toContain("adc67a29eb7162f6f1b5dabcbca320009480695e");
expect(dockerfile).toContain("https://github.com/flare-foundation/tee-node.git");
expect(sourceCompose).toContain("dockerfile: infra/fcc/tee-node.Dockerfile");
expect(imageCompose).toContain("FCC_TEE_NODE_IMAGE");
expect(sourceCompose).not.toMatch(/^\s*ports:/m);
expect(imageCompose).not.toMatch(/^\s*ports:/m);
```

- [ ] **Step 2: Run RED and confirm source mode and missing files fail**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm vitest run scripts/fixtures/fcc-container-config.test.ts"
```

Expected: FAIL because the current preflight requires image variables and the source Dockerfile/image Compose template do not exist.

- [ ] **Step 3: Commit the RED checkpoint**

```bash
git add scripts/fixtures/fcc-container-config.test.ts
git commit -m "test: define FCC source and image pin modes"
```

- [ ] **Step 4: Implement fail-closed mode selection**

Replace `scripts/setup/check-fcc-container-config.sh` with logic equivalent to:

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly tee_node_ref="v0.0.24"
readonly tee_node_commit="adc67a29eb7162f6f1b5dabcbca320009480695e"
image="${FCC_TEE_NODE_IMAGE:-}"
pin_source="${FCC_TEE_NODE_PIN_SOURCE:-}"

if [[ -z "$image" && -z "$pin_source" ]]; then
  printf 'MODE    official-source\n'
  printf 'PASS    tee-node ref %s resolves to reviewed commit %s\n' "$tee_node_ref" "$tee_node_commit"
  exit 0
fi

failures=0
if [[ -z "$image" || -z "$pin_source" ]]; then
  printf 'FAIL    image override requires FCC_TEE_NODE_IMAGE and FCC_TEE_NODE_PIN_SOURCE\n'
  failures=$((failures + 1))
fi
if [[ -n "$image" && ! "$image" =~ @sha256:[0-9a-f]{64}$ ]]; then
  printf 'FAIL    FCC tee-node image must end in @sha256:<64 lowercase hex chars>\n'
  failures=$((failures + 1))
fi
if ((failures > 0)); then
  printf '\nFCC container configuration is intentionally blocked.\n'
  exit 1
fi

printf 'MODE    digest-image\n'
printf 'PASS    FCC tee-node reference is digest-pinned\n'
```

Update `check-fcc-access.sh` so `FCC_TEE_NODE_IMAGE` and
`FCC_TEE_NODE_PIN_SOURCE` are removed from the unconditional `required` loop.
Invoke `check-fcc-container-config.sh` once after the loop and increment
`missing` when it exits nonzero.

- [ ] **Step 5: Create the verified source builder**

Create `infra/fcc/tee-node.Dockerfile` with fixed reviewed constants:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.25.1-trixie@sha256:ff83f3762390c2cccb53618ccc18af23e556aff9b1db4428637e9f63287c8171 AS builder

ARG SOURCE_DATE_EPOCH=1785100800
ENV SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH
WORKDIR /build

RUN git clone --filter=blob:none https://github.com/flare-foundation/tee-node.git tee-node && \
    cd tee-node && \
    git checkout v0.0.24 && \
    test "$(git rev-parse HEAD)" = "adc67a29eb7162f6f1b5dabcbca320009480695e"

WORKDIR /build/tee-node
RUN go mod download && go mod verify
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOFLAGS="-buildvcs=false" \
    go build -trimpath -ldflags="-buildid= -s -w" -o /app/server ./cmd/extension
RUN cp assets/google_confidential_space_root.crt /app/google_confidential_space_root.crt && \
    find /app -exec touch -h -d @${SOURCE_DATE_EPOCH} {} +

FROM gcr.io/distroless/static-debian12@sha256:20bc6c0bc4d625a22a8fde3e55f6515709b32055ef8fb9cfbddaa06d1760f838
WORKDIR /app
COPY --from=builder /app/server /app/server
COPY --from=builder /app/google_confidential_space_root.crt /app/assets/google_confidential_space_root.crt
ENV MODE=0
EXPOSE 5500
CMD ["/app/server"]
```

The source URL, tag, and expected commit remain literals; do not convert them to
build arguments or environment variables.

- [ ] **Step 6: Create explicit source and image Compose templates**

Make `infra/fcc/docker-compose.template.yml` the source-mode template:

```yaml
name: hushflow-fcc

services:
  tee-node:
    build:
      context: ../..
      dockerfile: infra/fcc/tee-node.Dockerfile
    image: hushflow/tee-node:v0.0.24-source
    restart: "no"

  hushflow-extension:
    build:
      context: ../..
      dockerfile: services/fcc-extension/Dockerfile
    depends_on:
      tee-node:
        condition: service_started
    network_mode: service:tee-node
    environment:
      EXTENSION_PORT: "${EXTENSION_PORT:-7702}"
      SIGN_PORT: "${SIGN_PORT:-7701}"
    restart: "no"
```

Create `infra/fcc/docker-compose.image.template.yml` as the complete immutable
image-mode template:

```yaml
name: hushflow-fcc

services:
  tee-node:
    image: ${FCC_TEE_NODE_IMAGE:?Set a digest-pinned tee-node image first}
    restart: "no"

  hushflow-extension:
    build:
      context: ../..
      dockerfile: services/fcc-extension/Dockerfile
    depends_on:
      tee-node:
        condition: service_started
    network_mode: service:tee-node
    environment:
      EXTENSION_PORT: "${EXTENSION_PORT:-7702}"
      SIGN_PORT: "${SIGN_PORT:-7701}"
    restart: "no"
```

- [ ] **Step 7: Run targeted GREEN tests and no-run Compose validation**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm vitest run scripts/fixtures/fcc-container-config.test.ts"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm preflight:fcc-container"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && docker compose -f infra/fcc/docker-compose.template.yml config --quiet"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && FCC_TEE_NODE_IMAGE=registry.example/tee-node@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa docker compose -f infra/fcc/docker-compose.image.template.yml config --quiet"
```

Expected: tests and both preflight modes pass; both Compose commands exit zero without pulling, building, or starting a container.

- [ ] **Step 8: Commit the GREEN checkpoint**

```bash
git add infra/fcc/tee-node.Dockerfile infra/fcc/docker-compose.template.yml infra/fcc/docker-compose.image.template.yml scripts/setup/check-fcc-container-config.sh scripts/setup/check-fcc-access.sh
git commit -m "feat: add official source-pinned FCC runtime"
```

---

### Task 4: Update Operator and Submission Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/runbooks/coston2-m1-live.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/verification/m1-local-fcc-slice.md`
- Modify: `docs/submission/hackathon.md`

**Interfaces:**
- Consumes: the two Compose template paths and mode semantics from Task 3.
- Produces: one consistent operator workflow that never labels local source compatibility as live FCC evidence.

- [ ] **Step 1: Update environment guidance**

Replace the image-only comment in `.env.example` with:

```dotenv
# Leave both values blank to build the reviewed official Flare tee-node source:
# repository flare-foundation/tee-node, tag v0.0.24, commit adc67a29...
# Set both values only for an organizer/Flare image override. The image must use
# an immutable @sha256 digest and the source must identify its publication.
FCC_TEE_NODE_IMAGE=
FCC_TEE_NODE_PIN_SOURCE=
```

- [ ] **Step 2: Update README and runbook commands**

Document these no-run validation paths:

```bash
pnpm preflight:fcc-container
docker compose -f infra/fcc/docker-compose.template.yml config --quiet
```

Document the image override separately:

```bash
FCC_TEE_NODE_IMAGE="$FCC_TEE_NODE_IMAGE" \
  docker compose -f infra/fcc/docker-compose.image.template.yml config --quiet
```

State explicitly that source mode may perform network access only when an
operator later runs `docker compose build`; `config` and preflight do not pull,
build, run, register, tunnel, or broadcast.

- [ ] **Step 3: Align architecture, verification, and submission status**

Add these facts without claiming live acceptance:

- official source mode is pinned to tag `v0.0.24` and commit `adc67a29...`;
- immutable image mode remains available when an official digest is supplied;
- the private signing port is never published;
- local tests and Compose rendering are preparation evidence only;
- indexer credentials, proxy/tunnel, registry/signer confirmation, live
  registration, and Coston2 transactions remain pending.

- [ ] **Step 4: Run documentation and consistency checks**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm format:check"
rg -n "v0\.0\.24|adc67a29|docker-compose\.image\.template" README.md .env.example docs/architecture/overview.md docs/runbooks/coston2-m1-live.md docs/verification/m1-local-fcc-slice.md docs/submission/hackathon.md
rg -n "organizer-approved image.*required|image.*only" README.md docs .env.example
```

Expected: format passes; the first search finds the new dual-mode wording; the
second search returns no stale claim that a prebuilt organizer image is the only
supported local path.

- [ ] **Step 5: Commit the documentation checkpoint**

```bash
git add .env.example README.md docs/runbooks/coston2-m1-live.md docs/architecture/overview.md docs/verification/m1-local-fcc-slice.md docs/submission/hackathon.md
git commit -m "docs: document dual-mode FCC live preparation"
```

---

### Task 5: Run the Complete Release Verification Loop

**Files:**
- Review only: all files changed in Tasks 1-4.

**Interfaces:**
- Consumes: green task-level checkpoints.
- Produces: final evidence that build, typecheck, lint, tests, coverage, contracts, browser, security, and Compose gates agree.

- [ ] **Step 1: Run the root verification gate**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm verify"
```

Expected: formatting, lint, typecheck, 80%+ coverage, all package builds, and the Next production build pass.

- [ ] **Step 2: Run Solidity fuzz and invariant verification**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && forge test"
```

Expected: 52 tests pass, zero fail, zero skip; three invariant properties report zero handler reverts.

- [ ] **Step 3: Run browser smoke tests**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm e2e:web"
```

Expected: Chromium desktop and Pixel 5 cases pass with fixture provenance visible and write controls disabled.

- [ ] **Step 4: Re-run both FCC configuration modes**

```bash
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && pnpm preflight:fcc-container"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && source scripts/setup/use-local-tools.sh && FCC_TEE_NODE_IMAGE=registry.example/tee-node@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa FCC_TEE_NODE_PIN_SOURCE=https://example.invalid/official-pin-record pnpm preflight:fcc-container"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && docker compose -f infra/fcc/docker-compose.template.yml config --quiet"
wsl.exe bash -lc "cd /mnt/c/Users/ASUS/Documents/coding/HushFlow && FCC_TEE_NODE_IMAGE=registry.example/tee-node@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa docker compose -f infra/fcc/docker-compose.image.template.yml config --quiet"
```

Expected: all commands pass without pulling, building, or running containers.

- [ ] **Step 5: Perform security and diff review**

```bash
git diff e1b6d03..HEAD --check
git diff e1b6d03..HEAD --stat
git diff e1b6d03..HEAD -- . ':!pnpm-lock.yaml'
git status --short --branch
```

Review that:

- `.claude/` is absent from the diff;
- no secret value or private key was added;
- source URL/tag/commit are literals;
- image validation accepts no floating tag;
- Compose publishes no tee-node port;
- no deployment manifest or address changed; and
- no lockfile or dependency changed.

- [ ] **Step 6: Commit any verification-only documentation correction**

If Task 5 requires an evidence wording correction, stage only that documentation
and commit it:

```bash
git add docs/verification/m1-local-fcc-slice.md docs/submission/hackathon.md
git commit -m "docs: record release gate verification"
```

If no file changes are needed, do not create an empty commit.
