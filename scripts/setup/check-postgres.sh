#!/usr/bin/env bash
set -euo pipefail

compose_file='infra/compose/docker-compose.yml'
repo_root="$(git rev-parse --show-toplevel)"
export DOCKER_CONFIG="$repo_root/.tools/docker-public-config"

mkdir -p "$DOCKER_CONFIG"
printf '{"auths":{}}\n' >"$DOCKER_CONFIG/config.json"

cleanup() {
  docker compose -f "$compose_file" down >/dev/null 2>&1 || true
}

trap cleanup EXIT
docker compose -f "$compose_file" up -d

for attempt in $(seq 1 30); do
  status="$(
    docker inspect \
      --format='{{.State.Health.Status}}' \
      hushflow-local-postgres-1 2>/dev/null || true
  )"
  if [[ "$status" == 'healthy' ]]; then
    docker compose -f "$compose_file" ps
    exit 0
  fi
  sleep 2
done

docker compose -f "$compose_file" logs postgres
exit 1
