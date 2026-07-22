#!/usr/bin/env bash
set -euo pipefail

failures=0

check_exact() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$actual" == "$expected" ]]; then
    printf 'PASS %-10s %s\n' "$name" "$actual"
  else
    printf 'FAIL %-10s expected=%s actual=%s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

check_contains() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$actual" == *"$expected"* ]]; then
    printf 'PASS %-10s %s\n' "$name" "$expected"
  else
    printf 'FAIL %-10s expected-fragment=%s actual=%s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'FAIL %-10s command is missing\n' "$name"
    failures=$((failures + 1))
    return 1
  fi
}

if require_command node; then
  check_exact node v24.18.0 "$(node --version)"
fi

if require_command corepack; then
  check_exact pnpm 11.15.1 "$(corepack pnpm --version)"
fi

if require_command go; then
  check_contains go 'go1.26.5' "$(go version)"
fi

if require_command forge; then
  check_contains forge '1.7.1' "$(forge --version | head -n 1)"
fi

if require_command docker; then
  check_contains docker '29.1.3' "$(docker --version)"
fi

require_command curl || true
require_command git || true
require_command jq || true

if ((failures > 0)); then
  printf '\nToolchain preflight failed with %d issue(s).\n' "$failures"
  exit 1
fi

printf '\nToolchain preflight passed.\n'
