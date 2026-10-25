-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "professional_id" UUID,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocks_business_id_ends_at_idx" ON "blocks"("business_id", "ends_at");

-- CreateIndex
CREATE INDEX "blocks_professional_id_idx" ON "blocks"("professional_id");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_professional_id_business_id_fkey" FOREIGN KEY ("professional_id", "business_id") REFERENCES "professionals"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_tenant_isolation" ON "blocks"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

-- Same rules as @turnero/shared, enforced by the database too. (With a NULL professional_id
-- the composite foreign key is not checked: the block applies to the whole business.)
ALTER TABLE "blocks"
    ADD CONSTRAINT "blocks_period_check"
        CHECK ("starts_at" < "ends_at" AND "ends_at" <= "starts_at" + interval '367 days'),
    ADD CONSTRAINT "blocks_reason_length_check"
        CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 120);
