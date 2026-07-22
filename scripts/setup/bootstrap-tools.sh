#!/usr/bin/env bash
set -euo pipefail

root_dir="$(git rev-parse --show-toplevel)"
tools_dir="$root_dir/.tools"
downloads_dir="$tools_dir/downloads"

if [[ "$tools_dir" != "$root_dir/.tools" ]]; then
  printf 'Refusing to use unexpected tools directory.\n' >&2
  exit 1
fi

mkdir -p "$downloads_dir" "$tools_dir/bin"

download_and_verify() {
  local url="$1"
  local output="$2"
  local expected_sha="$3"

  if [[ ! -f "$output" ]]; then
    curl --fail --location --show-error --output "$output" "$url"
  fi

  if ! printf '%s  %s\n' "$expected_sha" "$output" | sha256sum --check --status; then
    rm -f "$output"
    printf 'Checksum verification failed for %s\n' "$output" >&2
    exit 1
  fi
}

node_archive="$downloads_dir/node-v24.18.0-linux-x64.tar.xz"
download_and_verify \
  'https://nodejs.org/dist/v24.18.0/node-v24.18.0-linux-x64.tar.xz' \
  "$node_archive" \
  '55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742'

if [[ ! -x "$tools_dir/node/bin/node" ]]; then
  rm -rf "$tools_dir/node"
  mkdir -p "$tools_dir/node"
  tar -xJf "$node_archive" --strip-components=1 -C "$tools_dir/node"
fi

go_archive="$downloads_dir/go1.26.5.linux-amd64.tar.gz"
download_and_verify \
  'https://go.dev/dl/go1.26.5.linux-amd64.tar.gz' \
  "$go_archive" \
  '5c2c3b16caefa1d968a94c1daca04a7ca301a496d9b086e17ad77bb81393f053'

if [[ ! -x "$tools_dir/go/bin/go" ]]; then
  rm -rf "$tools_dir/go"
  mkdir -p "$tools_dir/go"
  tar -xzf "$go_archive" --strip-components=1 -C "$tools_dir/go"
fi

if [[ ! -x "$tools_dir/foundry/forge" ]]; then
  foundry_archive='/tmp/hushflow-foundry-v1.7.1-linux-amd64.tar.gz'
  download_and_verify \
    'https://github.com/foundry-rs/foundry/releases/download/v1.7.1/foundry_v1.7.1_linux_amd64.tar.gz' \
    "$foundry_archive" \
    'cf7e688ed0c4c48adffca788b496076e31060b67ac5afe1e43dbb5499c20c88b'
  rm -rf "$tools_dir/foundry"
  mkdir -p "$tools_dir/foundry"
  tar -xzf "$foundry_archive" -C "$tools_dir/foundry"
fi

jq_binary="$tools_dir/bin/jq"
download_and_verify \
  'https://github.com/jqlang/jq/releases/download/jq-1.8.2/jq-linux-amd64' \
  "$jq_binary" \
  'b1c22172dd303f3be49e935aa56aa48a8b7a46e0bc838b4997d3bb451495870f'
chmod 0755 "$jq_binary"

source "$root_dir/scripts/setup/use-local-tools.sh"
corepack enable --install-directory "$tools_dir/node/bin"
corepack prepare pnpm@11.15.1 --activate

printf '\nRepository-local toolchain installed in %s\n' "$tools_dir"
printf 'Run: source scripts/setup/use-local-tools.sh\n'
