-- CreateEnum
CREATE TYPE "business_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('owner', 'admin', 'employee');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "time_zone" TEXT NOT NULL,
    "status" "business_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "member_role" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "members_user_id_idx" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_business_id_user_id_key" ON "members"("business_id", "user_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

-- Needed later by the exclusion constraint that prevents double bookings.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Business of the current request, set per transaction with
-- set_config('app.current_business_id', <uuid>, true). NULL when unset, so policies fail closed.
CREATE FUNCTION app_current_business_id() RETURNS uuid
    LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_business_id', true), '')::uuid
$$;

-- Row level security: a business only sees and writes its own rows.
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_tenant_isolation" ON "businesses"
    USING ("id" = app_current_business_id())
    WITH CHECK ("id" = app_current_business_id());

ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_tenant_isolation" ON "members"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

-- Runtime role privileges. Tables are owned by the migration role, so RLS applies to turnero_app.
GRANT USAGE ON SCHEMA public TO turnero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "businesses", "users", "members" TO turnero_app;
GRANT EXECUTE ON FUNCTION app_current_business_id() TO turnero_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO turnero_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO turnero_app;
