-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_professionals" (
    "business_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,

    CONSTRAINT "service_professionals_pkey" PRIMARY KEY ("service_id","professional_id")
);

-- CreateIndex
CREATE INDEX "services_business_id_idx" ON "services"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_id_business_id_key" ON "services"("id", "business_id");

-- CreateIndex
CREATE INDEX "service_professionals_professional_id_idx" ON "service_professionals"("professional_id");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_service_id_business_id_fkey" FOREIGN KEY ("service_id", "business_id") REFERENCES "services"("id", "business_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_professional_id_business_id_fkey" FOREIGN KEY ("professional_id", "business_id") REFERENCES "professionals"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_tenant_isolation" ON "services"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

ALTER TABLE "service_professionals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_professionals_tenant_isolation" ON "service_professionals"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

-- Same rules as @turnero/shared, enforced by the database too.
ALTER TABLE "services"
    ADD CONSTRAINT "services_name_length_check"
        CHECK (char_length("name") BETWEEN 1 AND 80 AND "name" = btrim("name")),
    ADD CONSTRAINT "services_duration_check"
        CHECK ("duration_minutes" BETWEEN 5 AND 480 AND "duration_minutes" % 5 = 0),
    ADD CONSTRAINT "services_price_cents_check"
        CHECK ("price_cents" BETWEEN 0 AND 1000000),
    ADD CONSTRAINT "services_buffer_check"
        CHECK ("buffer_minutes" BETWEEN 0 AND 60 AND "buffer_minutes" % 5 = 0);

-- Two active services of the same business cannot share a name (case-insensitive).
CREATE UNIQUE INDEX "services_active_name_key"
    ON "services" ("business_id", lower("name"))
    WHERE "active";
