#!/usr/bin/env bash
# Teste les migrations, le seed et les règles de sécurité sur un PostgreSQL local jetable.
# Prérequis : PostgreSQL 15+ installé (initdb, pg_ctl, psql dans le PATH ou /usr/lib/postgresql/*/bin).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
export PATH="${PGBIN:+$PGBIN:}$PATH"
DATA="$(mktemp -d)/pgdata"
PORT="${PGPORT_TEST:-54329}"
RUN=""
if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown -R postgres "$(dirname "$DATA")"; fi

$RUN initdb -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
$RUN pg_ctl -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" -w start >/dev/null
trap '$RUN pg_ctl -D "$DATA" -m immediate stop >/dev/null 2>&1 || true' EXIT

PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -c "create database app;"
"${PSQL[@]}" -d app -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "→ migration $(basename "$f")"; "${PSQL[@]}" -d app -f "$f"; done
echo "→ seed"
"${PSQL[@]}" -d app -f "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -d app -c "select count(*) as modules from public.modules; select count(*) as lecons from public.lessons;"
echo "→ tests de sécurité"
"${PSQL[@]}" -d app -f "$ROOT/supabase/tests/10_security_test.sql"
