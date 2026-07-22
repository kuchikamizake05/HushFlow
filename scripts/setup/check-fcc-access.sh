#!/usr/bin/env bash
set -euo pipefail

missing=0

for name in \
  FCC_INDEXER_DB_HOST \
  FCC_INDEXER_DB_PORT \
  FCC_INDEXER_DB_NAME \
  FCC_INDEXER_DB_USER \
  FCC_INDEXER_DB_PASSWORD \
  FCC_EXT_PROXY_URL \
  FCC_NORMAL_PROXY_URL; do
  value="$(printenv "$name" 2>/dev/null || true)"
  if [[ -n "$value" ]]; then
    printf 'SET     %s\n' "$name"
  else
    printf 'MISSING %s\n' "$name"
    missing=$((missing + 1))
  fi
done

ext_proxy_url="$(printenv FCC_EXT_PROXY_URL 2>/dev/null || true)"
if [[ -n "$ext_proxy_url" ]]; then
  if curl --fail --silent --show-error --max-time 10 \
    "$ext_proxy_url/info" >/dev/null; then
    printf 'PASS    FCC extension proxy /info is reachable\n'
  else
    printf 'FAIL    FCC extension proxy /info is not reachable\n'
    missing=$((missing + 1))
  fi
fi

if ((missing > 0)); then
  printf '\nFCC access preflight blocked by %d missing or unreachable item(s).\n' "$missing"
  exit 1
fi

printf '\nFCC access preflight passed without printing secret values.\n'
