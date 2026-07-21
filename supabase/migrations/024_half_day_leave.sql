-- Migration 024: Half-Day Leave Support
-- Run this in your Supabase dashboard SQL editor or via Supabase CLI

-- Add is_half_day and half_day_period to leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT FALSE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day_period TEXT CHECK (half_day_period IN ('morning', 'afternoon'));

-- Update leave_balances to track half-day usage
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS half_day_used NUMERIC(5,2) DEFAULT 0;

-- Update the remaining generated column to account for half-day usage
-- Note: remaining already accounts for total_allocated - used
-- We'll track half-day separately in the used field (0.5 per half-day)
