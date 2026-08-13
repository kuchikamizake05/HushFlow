#!/usr/bin/env bash
set -euo pipefail

image="${M6_CONTAINER_IMAGE:-}"

if [[ -z "$image" ]]; then
  printf 'FAIL    M6_CONTAINER_IMAGE is required for an explicit scan step\n'
  exit 1
fi

if [[ ! "$image" =~ @sha256:[0-9a-f]{64}$ ]]; then
  printf 'FAIL    M6 container image must end in @sha256:<64 lowercase hex chars>\n'
  exit 1
fi

if ! command -v trivy >/dev/null 2>&1; then
  printf 'FAIL    trivy is required before an operator may scan the approved digest\n'
  exit 1
fi

printf 'PASS    immutable image digest accepted for explicit operator scan\n'
printf 'PASS    trivy is available; this preflight did not pull or scan an image\n'
