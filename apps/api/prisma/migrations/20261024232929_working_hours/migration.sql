-- CreateTable
CREATE TABLE "working_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "working_hours_professional_id_idx" ON "working_hours"("professional_id");

-- CreateIndex
CREATE INDEX "working_hours_business_id_idx" ON "working_hours"("business_id");

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_professional_id_business_id_fkey" FOREIGN KEY ("professional_id", "business_id") REFERENCES "professionals"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

ALTER TABLE "working_hours" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "working_hours_tenant_isolation" ON "working_hours"
    USING ("business_id" = app_current_business_id())
    WITH CHECK ("business_id" = app_current_business_id());

-- Same rules as @turnero/shared, enforced by the database too.
ALTER TABLE "working_hours"
    ADD CONSTRAINT "working_hours_weekday_check"
        CHECK ("weekday" BETWEEN 1 AND 7),
    ADD CONSTRAINT "working_hours_minutes_check"
        CHECK ("start_minute" >= 0 AND "end_minute" <= 1440
               AND "start_minute" < "end_minute"
               AND "start_minute" % 5 = 0 AND "end_minute" % 5 = 0),
    -- Ranges of the same professional and day cannot overlap ([start, end) so 9-13 and 13-18
    -- may touch). Uses btree_gist, enabled in the first migration.
    ADD CONSTRAINT "working_hours_no_overlap"
        EXCLUDE USING gist (
            "professional_id" WITH =,
            "weekday" WITH =,
            int4range("start_minute", "end_minute") WITH &&
        );
