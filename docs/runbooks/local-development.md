# Local Development Runbook

## Canonical environment

Use WSL2 Ubuntu 24.04 with Docker Desktop WSL integration. Run repository commands from the mounted workspace and keep all secrets in an ignored .env.local file.

## Bootstrap

1. Install the versions listed in .tool-versions with the repository bootstrap script.
2. Source the repository-local tool environment.
3. Copy .env.example to .env.local and fill only locally available values.
4. Install exact dependencies.
5. Run verification.

Commands:

    bash scripts/setup/bootstrap-tools.sh
    source scripts/setup/use-local-tools.sh
    pnpm install --frozen-lockfile
    pnpm preflight:toolchain
    pnpm verify

## Preflight

Coston2 checks are read-only:

    set -a
    source .env.local
    set +a
    pnpm preflight:coston2

FCC access checks print only whether required values are set:

    pnpm preflight:fcc

## Safety boundaries

- Do not commit .env.local.
- Do not commit the repository-local .tools directory.
- Do not print database passwords, tunnel tokens, or private keys.
- Do not request faucet assets, start a public tunnel, register an FCC extension, or deploy a contract without explicit approval.
- A simulated local TEE is development evidence only.
