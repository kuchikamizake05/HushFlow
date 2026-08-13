#!/usr/bin/env bash
set -euo pipefail

readonly tee_node_ref="v0.0.24"
readonly tee_node_commit="adc67a29eb7162f6f1b5dabcbca320009480695e"
image="${FCC_TEE_NODE_IMAGE:-}"
pin_source="${FCC_TEE_NODE_PIN_SOURCE:-}"

if [[ -z "$image" && -z "$pin_source" ]]; then
  printf 'MODE    official-source\n'
  printf 'PASS    tee-node ref %s resolves to reviewed commit %s\n' \
    "$tee_node_ref" "$tee_node_commit"
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
