#!/usr/bin/env bash
set -euo pipefail

failures=0

required() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    printf 'MISSING %s\n' "$name"
    failures=$((failures + 1))
  else
    printf 'SET     %s\n' "$name"
  fi
}

required FCC_TEE_NODE_IMAGE
required FCC_TEE_NODE_PIN_SOURCE

tee_node_image="${FCC_TEE_NODE_IMAGE:-}"
if [[ -n "$tee_node_image" ]]; then
  if [[ "$tee_node_image" =~ @sha256:[0-9a-f]{64}$ ]]; then
    printf 'PASS    FCC tee-node reference is digest-pinned\n'
  else
    printf 'FAIL    FCC tee-node image must end in @sha256:<64 lowercase hex chars>\n'
    failures=$((failures + 1))
  fi
fi

if ((failures > 0)); then
  printf '\nFCC container configuration is intentionally blocked. Do not start a substitute tee-node.\n'
  exit 1
fi

printf '\nFCC container configuration is ready for the organizer-approved image only.\n'
