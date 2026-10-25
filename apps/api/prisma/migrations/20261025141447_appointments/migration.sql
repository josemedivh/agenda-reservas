-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "appointment_source" AS ENUM ('online', 'manual');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "busy_until" TIMESTAMPTZ NOT NULL,
    "status" "appointment_status" NOT NULL,
    "source" "appointment_source" NOT NULL,
    "service_name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_phone_key" ON "customers"("business_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_business_id_key" ON "customers"("id", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_code_hash_key" ON "appointments"("code_hash");

-- CreateIndex
CREATE INDEX "appointments_business_id_starts_at_idx" ON "appointments"("business_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_customer_id_idx" ON "appointments"("customer_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_business_id_fkey" FOREIGN KEY ("professional_id", "business_id") REFERENCES "professionals"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_business_id_fkey" FOREIGN KEY ("service_id", "business_id") REFERENCES "services"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_business_id_fkey" FOREIGN KEY ("customer_id", "business_id") REFERENCES "customers"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_tenant_isolation" ON "customers"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_tenant_isolation" ON "appointments"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

-- Same rules as @turnero/shared, enforced by the database too.
ALTER TABLE "customers"
    ADD CONSTRAINT "customers_name_length_check"
        CHECK (char_length("name") BETWEEN 2 AND 80 AND "name" = btrim("name")),
    ADD CONSTRAINT "customers_phone_e164_check"
        CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$'),
    ADD CONSTRAINT "customers_email_length_check"
        CHECK ("email" IS NULL OR char_length("email") BETWEEN 3 AND 254),
    ADD CONSTRAINT "customers_notes_length_check"
        CHECK ("notes" IS NULL OR char_length("notes") BETWEEN 1 AND 500);

ALTER TABLE "appointments"
    -- The service lasts at most 480 minutes and the preparation at most 60.
    ADD CONSTRAINT "appointments_period_check"
        CHECK ("starts_at" < "ends_at" AND "ends_at" <= "busy_until"
               AND "busy_until" <= "starts_at" + interval '540 minutes'),
    ADD CONSTRAINT "appointments_service_name_length_check"
        CHECK (char_length("service_name") BETWEEN 1 AND 80),
    ADD CONSTRAINT "appointments_price_cents_check"
        CHECK ("price_cents" BETWEEN 0 AND 1000000),
    -- The guarantee against double booking: two appointments of the same professional cannot
    -- overlap (busy span, preparation included) unless one of them was cancelled. Two people
    -- booking the same time at the same instant: only one insert succeeds. Uses btree_gist,
    -- enabled in the first migration.
    ADD CONSTRAINT "appointments_no_overlap"
        EXCLUDE USING gist (
            "professional_id" WITH =,
            tstzrange("starts_at", "busy_until") WITH &&
        ) WHERE ("status" <> 'cancelled');

-- The public booking page only knows the link (slug), but RLS hides every business until one
-- is chosen. This finds the id of an active business by its link and exposes nothing else.
CREATE FUNCTION active_business_id_by_slug(p_slug text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
    SELECT id FROM businesses WHERE slug = p_slug AND status = 'active'
$$;

REVOKE ALL ON FUNCTION active_business_id_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION active_business_id_by_slug(text) TO turnero_app;
