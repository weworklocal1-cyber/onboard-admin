-- =============================================
-- 033_restaurants_dedupe_constraint.sql
-- Fix 48x duplicates caused by race in GET /api/workforce/restaurants
-- =============================================

-- 1. Cleanup existing duplicates: keep oldest per google_place_id, re-point FKs, delete rest
-- Re-point child tables before delete to avoid orphan
DO $$
DECLARE
  dup RECORD;
  keeper UUID;
  victims UUID[];
BEGIN
  FOR dup IN SELECT google_place_id FROM restaurants WHERE google_place_id IS NOT NULL GROUP BY google_place_id HAVING count(*) > 1
  LOOP
    -- keep earliest created_at
    SELECT id INTO keeper FROM restaurants WHERE google_place_id = dup.google_place_id ORDER BY created_at ASC LIMIT 1;
    SELECT array_agg(id) INTO victims FROM restaurants WHERE google_place_id = dup.google_place_id AND id != keeper;

    IF victims IS NOT NULL THEN
      -- re-point interactions, follow_ups, documents
      UPDATE restaurant_interactions SET restaurant_id = keeper WHERE restaurant_id = ANY(victims);
      UPDATE follow_ups SET restaurant_id = keeper WHERE restaurant_id = ANY(victims);
      UPDATE restaurant_documents SET restaurant_id = keeper WHERE restaurant_id = ANY(victims);
      -- optional: merge avg_rating/review_count keep highest
      -- delete victims
      DELETE FROM restaurants WHERE id = ANY(victims);
      RAISE NOTICE 'Deduped %: kept %, removed % victims', dup.google_place_id, keeper, array_length(victims,1);
    END IF;
  END LOOP;
END $$;

-- 2. Add partial unique index to prevent future race (concurrent upserts now atomic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_place_id_unique ON restaurants(google_place_id) WHERE google_place_id IS NOT NULL;

-- 3. Optional helper index for manual dedupe (name+phone+city)
CREATE INDEX IF NOT EXISTS idx_restaurants_name_phone_city ON restaurants(lower(name), owner_phone, lower(city));
