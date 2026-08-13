# HushFlow Release Gates and FCC Source Pin Design

Date: 2026-08-13

Status: approved design; implementation pending

## 1. Objective

Restore a fully green local release gate and remove the unnecessary dependency
on an unpublished prebuilt `tee-node` image without weakening FCC supply-chain
controls.

This scope covers four outcomes:

1. restore the M4B production build;
2. make the root formatting and verification gates ignore local worktree
   artifacts while keeping tracked files formatted;
3. rerun the complete local verification suite; and
4. let the M1 FCC live kit use either a digest-pinned image or a reproducible
   build from the official Flare `tee-node` source pin.

It does not authorize a Coston2 broadcast, public tunnel, credential change,
faucet request, or live FCC registration.

## 2. Current Failures

### 2.1 Web build

The root typecheck passes, but Next/Turbopack cannot resolve local web imports
that end in `.js` when the source file is TypeScript. The affected imports are
in the M4A adapter, fixture adapter, and data-status banner.

The web package already uses `moduleResolution: "bundler"`, so local web
imports should remain extensionless. Node-oriented emitted packages may keep
their explicit `.js` imports.

### 2.2 Formatting gate

The untracked `.claude/` worktree directory contains generated `.next` output
and is currently scanned by Prettier. The root gate also reports tracked drift
in `apps/web/app/globals.css` and `eslint.config.mjs`.

`.claude/` is local tooling state and will be ignored by Git and Prettier. Only
the tracked drift will be formatted; generated worktree content will not be
rewritten or committed.

### 2.3 FCC container pin

The existing Compose template accepts only `FCC_TEE_NODE_IMAGE` with an
immutable digest. Flare now publishes the official `tee-node` source and its
extension scaffold. The scaffold pins `github.com/flare-foundation/tee-node`
to `v0.0.24` and demonstrates a reproducible builder with a digest-pinned Go
base image.

The live kit should support this official source path while retaining the
existing image override for an organizer-provided image.

## 3. FCC Pin Modes

The live kit supports exactly one of two modes.

### 3.1 Official source mode (default)

- Repository identity is fixed in the Dockerfile to
  `https://github.com/flare-foundation/tee-node.git`.
- The default ref is the immutable release tag `v0.0.24`.
- The resolved source commit is recorded as
  `adc67a29eb7162f6f1b5dabcbca320009480695e`.
- The Go builder image is pinned by SHA-256 digest.
- The build runs `go mod download`, `go mod verify`, and produces a static
  Linux binary with trimmed paths and no VCS/build ID metadata.
- The HushFlow extension image copies the verified binary into the existing
  two-process container rather than downloading it at runtime.

The repository URL is not configurable. A future version bump changes both the
tag and expected commit in reviewed source.

### 3.2 Digest-pinned image mode (override)

- `FCC_TEE_NODE_IMAGE` must contain an image reference ending in
  `@sha256:<64 lowercase hexadecimal characters>`.
- `FCC_TEE_NODE_PIN_SOURCE` must identify the official organizer or Flare
  publication used to obtain the digest.
- Compose consumes the image without replacing or floating its tag.

### 3.3 Mode selection

- If `FCC_TEE_NODE_IMAGE` is unset, source mode is selected.
- If `FCC_TEE_NODE_IMAGE` is set, image mode is selected and its source field
  becomes mandatory.
- An incomplete image override fails closed instead of silently falling back to
  source mode.
- No environment variable may replace the official source repository or relax
  the expected commit.

## 4. Container Architecture

Source mode introduces a dedicated `tee-node` builder stage. Its output is a
minimal local base image containing only the server binary and required
Confidential Space certificate. The HushFlow extension Dockerfile consumes
that base and retains the existing extension runtime, private signing/decrypt
port, and bounded HTTP surface.

Image mode retains the current two-service Compose layout. Compose selects the
source-built local base or the supplied immutable image through an explicit
profile/override file; it does not construct image names by shell string
concatenation.

Neither mode exposes the tee-node signing port publicly. The extension shares
the required container/network boundary, while only the intended proxy-facing
surface is reachable.

## 5. Validation and Failure Behavior

The FCC container preflight validates configuration without pulling, building,
or starting containers.

It must:

- pass with no image variables by selecting the reviewed source pin;
- pass with a complete digest-pinned image override;
- reject a tag-only image, malformed digest, uppercase/noncanonical digest,
  or missing pin source;
- reject a pin-source value without an image override;
- report only variable names, selected mode, public refs, and pass/fail state;
- never print credentials or private keys; and
- leave Compose validation possible without a network pull or container run.

The source builder itself validates that checkout `v0.0.24` resolves to the
reviewed commit before compiling. A mismatch stops the build.

## 6. Test Strategy

Implementation follows a RED/GREEN sequence.

### 6.1 Web build regression

Add or extend a package-contract test that asserts browser-bundled local imports
remain extensionless. Demonstrate RED against the current `.js` imports, then
restore the imports and demonstrate GREEN with the targeted test and production
build.

### 6.2 Formatting boundary

Add `.claude/` to both Git and formatting ignore boundaries. Verify that the
untracked directory remains untouched and absent from the diff. Format the two
tracked files reported by the root gate.

### 6.3 FCC configuration

Extend the container configuration tests with:

- default official-source mode;
- complete image override;
- incomplete image override;
- non-digest image;
- malformed or noncanonical digest;
- stray pin-source configuration; and
- immutable official source/tag/commit assertions.

The tests inspect configuration and rendered Compose structure; they do not
pull or run `tee-node`.

### 6.4 Full verification

The final gate runs from the pinned WSL toolchain:

1. formatting;
2. lint;
3. typecheck;
4. Vitest coverage;
5. all production package builds;
6. Forge tests including fuzz and invariants;
7. FCC container preflight in source mode;
8. Compose config rendering without pull/run; and
9. Playwright browser smoke tests.

The minimum TypeScript coverage remains 80%. No milestone is marked release
ready while the production build or any required gate is red.

## 7. Documentation Changes

Update the README, M1 runbook, environment example, architecture evidence, and
submission status so they describe both supported pin modes. The documentation
must distinguish:

- source compatibility demonstrated locally;
- image digest supplied externally;
- live FCC acceptance; and
- Coston2 deployment evidence.

A locally successful source build is not labeled as a live FCC deployment.

## 8. Security Boundaries

- No secrets are added to tracked files.
- No source repository or commit is accepted from environment input.
- No floating image tag is accepted.
- No container starts during preflight or Compose validation.
- No testnet transaction or public tunnel is started by this work.
- Existing signer, replay, binding, privacy, and pending-deployment guards stay
  unchanged.

## 9. Acceptance Criteria

This scope is complete when:

- the web production build succeeds;
- `pnpm verify` succeeds with `.claude/` still untracked and untouched;
- all Forge tests pass;
- browser smoke tests pass;
- source mode pins Flare `tee-node v0.0.24` and verifies the expected commit;
- image mode accepts only an immutable digest plus provenance;
- FCC configuration tests cover both modes and all fail-closed cases;
- Compose renders without pulling or running containers; and
- documentation accurately states that live FCC and Coston2 acceptance remain
  pending credentials and explicit deployment approval.

