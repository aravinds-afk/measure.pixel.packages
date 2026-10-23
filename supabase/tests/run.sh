#!/usr/bin/env bash
# Runs migrations + seed + RLS tests against a throwaway local PostgreSQL database.
# Requires a local PostgreSQL superuser (default: postgres via sudo/su) — see docs/SETUP.md.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-connectsphere_test}
PSQL_SU=${PSQL_SU:-"su postgres -c"}
run_su() { $PSQL_SU "psql -v ON_ERROR_STOP=1 -q -X $*"; }
run_su "-c 'drop database if exists $DB' -c 'create database $DB'" >/dev/null
for f in supabase/tests/supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/rls_fixtures.sql; do
  run_su "-d $DB -f $PWD/$f" >/dev/null
done
run_su "-d $DB -c 'grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role; grant execute on all functions in schema public to service_role;'" >/dev/null
PGPASSWORD=test psql -h localhost -U authenticator -d "$DB" -v ON_ERROR_STOP=1 -X -q -f supabase/tests/rls_test.sql
