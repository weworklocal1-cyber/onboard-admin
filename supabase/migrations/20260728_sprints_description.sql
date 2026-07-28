-- =============================================
-- Add description column to sprints
-- =============================================

ALTER TABLE sprints ADD COLUMN IF NOT EXISTS description text;