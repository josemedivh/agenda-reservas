/*
  Warnings:

  - Made the column `phone` on table `businesses` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "businesses" ALTER COLUMN "phone" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Hand-written SQL (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

-- Same rules as @turnero/shared, enforced by the database too.
ALTER TABLE "businesses"
    ADD CONSTRAINT "businesses_slug_format_check"
        CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("slug") BETWEEN 3 AND 50),
    ADD CONSTRAINT "businesses_phone_e164_check"
        CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$'),
    ADD CONSTRAINT "businesses_name_length_check"
        CHECK (char_length("name") BETWEEN 2 AND 80);

-- Slugs are unique across all businesses, but RLS only shows the current one. This answers
-- "is it taken?" without exposing anything else about other businesses.
CREATE FUNCTION is_business_slug_taken(p_slug text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug)
$$;

REVOKE ALL ON FUNCTION is_business_slug_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_business_slug_taken(text) TO turnero_app;
