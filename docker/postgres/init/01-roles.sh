#!/usr/bin/env bash
# Creates the database roles used by Turnero. Runs once, when the PostgreSQL volume is created.
# CI runs it too, against the service container (connection taken from PGHOST/PGPASSWORD).
#
# - turnero_owner: owns the schema and runs Prisma migrations (CREATEDB for the shadow database).
# - turnero_app:   used by the API at runtime. It owns nothing, so row level security always applies.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" \
  -v test_db="${POSTGRES_DB}_test" \
  -v owner_password="${TURNERO_OWNER_PASSWORD:-turnero_owner}" \
  -v app_password="${TURNERO_APP_PASSWORD:-turnero_app}" <<'SQL'
CREATE ROLE turnero_owner LOGIN CREATEDB PASSWORD :'owner_password';
CREATE ROLE turnero_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD :'app_password';

ALTER DATABASE :"db" OWNER TO turnero_owner;
CREATE DATABASE :"test_db" OWNER turnero_owner;

GRANT CONNECT ON DATABASE :"db" TO turnero_app;
GRANT CONNECT ON DATABASE :"test_db" TO turnero_app;
SQL
