-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

-- Lists the businesses a user belongs to. Login needs this before any business is selected,
-- so it runs with the owner's rights (SECURITY DEFINER) instead of opening RLS on members.
-- The API only calls it with the id of the authenticated user.
CREATE FUNCTION user_memberships(p_user_id uuid)
RETURNS TABLE (business_id uuid, business_name text, business_slug text, role text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
    SELECT m.business_id, b.name, b.slug, m.role::text
    FROM members m
    JOIN businesses b ON b.id = m.business_id
    WHERE m.user_id = p_user_id
    ORDER BY b.name, m.business_id
$$;

REVOKE ALL ON FUNCTION user_memberships(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_memberships(uuid) TO turnero_app;
