-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professionals_business_id_idx" ON "professionals"("business_id");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

ALTER TABLE "professionals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "professionals_tenant_isolation" ON "professionals"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

ALTER TABLE "professionals"
    ADD CONSTRAINT "professionals_name_length_check"
        CHECK (char_length("name") BETWEEN 1 AND 60 AND "name" = btrim("name")),
    ADD CONSTRAINT "professionals_color_format_check"
        CHECK ("color" ~ '^#[0-9A-F]{6}$'),
    -- Lets other tables reference (professional, business) together, so a row can never point
    -- to a professional of another business (used by service assignments).
    ADD CONSTRAINT "professionals_id_business_id_key" UNIQUE ("id", "business_id");

-- Two active professionals of the same business cannot share a name (case-insensitive).
CREATE UNIQUE INDEX "professionals_active_name_key"
    ON "professionals" ("business_id", lower("name"))
    WHERE "active";
