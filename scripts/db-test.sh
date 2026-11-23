#!/usr/bin/env bash
# Applies the VYBE migrations to a throwaway Postgres container and runs the
# RLS/RPC suite. Requires Docker. Never touches a real Supabase project.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="vybe-db-test"
IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vybe \
  -p 55432:5432 \
  "$IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d vybe >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker exec "$CONTAINER" pg_isready -U postgres -d vybe >/dev/null 2>&1; then
  echo "Postgres did not become ready." >&2
  exit 1
fi

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -d vybe -v ON_ERROR_STOP=1 -q
}

psql_run < "$ROOT/supabase/tests/bootstrap.sql"
psql_run < "$ROOT/supabase/migrations/20261123000100_schema.sql"
psql_run < "$ROOT/supabase/migrations/20261123000200_rls_and_rpcs.sql"
psql_run < "$ROOT/supabase/tests/rls.sql"

echo "Database schema, RLS and RPC tests passed."
