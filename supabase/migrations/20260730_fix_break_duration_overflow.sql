-- Fix attendance_breaks.duration overflow and harden trigger
-- DECIMAL(4,2) max is 99.99 minutes. Long breaks overflow.
-- Bump column to DECIMAL(6,2) and cap trigger output at 480 minutes.

-- 1. Widen column safely
ALTER TABLE IF EXISTS attendance_breaks
  ALTER COLUMN duration TYPE DECIMAL(6,2);

-- 2. Replace trigger function with defensive version
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
DECLARE
  raw_minutes NUMERIC(6,2);
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    raw_minutes := ROUND((DATE_PART('EPOCH', NEW.end_time - NEW.start_time) / 60.0)::numeric, 2);
    NEW.duration := CASE
      WHEN raw_minutes < 0 THEN 0
      WHEN raw_minutes > 480 THEN 480
      ELSE raw_minutes
    END;
  ELSE
    NEW.duration := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure trigger exists and points to current function
DROP TRIGGER IF EXISTS calculate_break_duration_trigger ON attendance_breaks;

CREATE TRIGGER calculate_break_duration_trigger
  BEFORE INSERT OR UPDATE OF start_time, end_time ON attendance_breaks
  FOR EACH ROW EXECUTE FUNCTION calculate_break_duration();
