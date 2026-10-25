-- Creates Turnero's database roles in a managed PostgreSQL (Railway, etc.). Run it ONCE, as the
-- provider's superuser, before the first deploy (see docs/despliegue.md):
--
--   psql "<superuser connection URL>" -v ON_ERROR_STOP=1 \
--     -v owner_password='<new password>' -v app_password='<another new password>' \
--     -f docker/postgres/production-roles.sql
--
-- - turnero_owner: owns the database and its public schema; only runs Prisma migrations.
-- - turnero_app:   used by the API at runtime. It owns nothing, so row level security always
--                  applies. Never give it the owner's role or BYPASSRLS.

CREATE ROLE turnero_owner LOGIN PASSWORD :'owner_password';
CREATE ROLE turnero_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD :'app_password';

SELECT format('ALTER DATABASE %I OWNER TO turnero_owner', current_database()) \gexec
ALTER SCHEMA public OWNER TO turnero_owner;
SELECT format('GRANT CONNECT ON DATABASE %I TO turnero_app', current_database()) \gexec
