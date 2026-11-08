#!/usr/bin/env bash
# Spins up a throwaway Postgres, applies the migrations against a Supabase auth
# stub, and runs the RLS / consent-gate tests.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
DIR=.pgtest; PORT=${PGTEST_PORT:-54329}
rm -rf "$DIR"; mkdir -p "$DIR"
RUNAS=""
if [ "$(id -u)" = "0" ]; then id pgtest >/dev/null 2>&1 || useradd -M pgtest; chown -R pgtest "$DIR"; RUNAS="sudo -u pgtest"; command -v sudo >/dev/null || RUNAS="su pgtest -c"; fi
run() { if [ "$RUNAS" = "su pgtest -c" ]; then su pgtest -c "$*"; elif [ -n "$RUNAS" ]; then $RUNAS "$@"; else "$@"; fi; }
run "$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
run "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap 'run "$PGBIN/pg_ctl" -D "$DIR/data" -m fast stop >/dev/null; rm -rf "$DIR"' EXIT
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database aos"
$PSQL -d aos -f supabase/tests/auth_stub.sql
for m in supabase/migrations/0001_init.sql supabase/migrations/0003_service_role_grants.sql; do $PSQL -d aos -f "$m"; done
$PSQL -d aos -f supabase/tests/rls_test.sql
if [ -f supabase/seed.sql ]; then $PSQL -d aos -f supabase/seed.sql && echo "seed.sql applied cleanly"; fi
