-- 034_territory_restaurants_rls.sql
-- Only assigned territory restaurant list should be shown for onboarding_executive
-- Fixes: territory assignment alone does not make restaurants visible (assigned_executive_id was NULL)

-- Allow exec to read restaurants whose pincode belongs to any of his assigned territories
-- OR whose territory_id points to his territory
-- Keep existing policies: lead_read_all_restaurants + exec_read_assigned_restaurants

DROP POLICY IF EXISTS "exec_read_territory_restaurants" ON restaurants;

CREATE POLICY "exec_read_territory_restaurants"
  ON restaurants FOR SELECT
  USING (
    -- direct assignment still works
    assigned_executive_id = auth.uid()
    OR
    -- via territory link
    territory_id IN (SELECT id FROM territories WHERE assigned_executive_id = auth.uid())
    OR
    -- via pincode match (covers restaurants where territory_id not yet set)
    EXISTS (
      SELECT 1 FROM territories t
      WHERE t.assigned_executive_id = auth.uid()
        AND t.pincodes IS NOT NULL
        AND restaurants.pincode = ANY(t.pincodes)
    )
  );

-- Backfill territory_id for existing restaurants based on pincode (run once)
-- Updates restaurants.territory_id to the first territory whose pincodes contains the restaurant pincode
UPDATE restaurants r
SET territory_id = t.id
FROM territories t
WHERE r.territory_id IS NULL
  AND r.pincode IS NOT NULL
  AND r.pincode = ANY(t.pincodes)
  AND t.pincodes IS NOT NULL;

-- Ensure pincode index for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_pincode ON restaurants(pincode);
