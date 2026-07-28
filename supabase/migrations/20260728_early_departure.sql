-- =============================================
-- Early Departure Flag for Attendance
-- =============================================

-- 1. Add early_departure column
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_departure BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_departure_minutes INTEGER DEFAULT 0;

-- 2. Update the trigger function to detect early departure
CREATE OR REPLACE FUNCTION calculate_attendance_working_hours()
RETURNS TRIGGER AS $$
DECLARE
  shift_duration_hours NUMERIC(4,2) := 0;
  break_deduction NUMERIC(4,2) := 0;
  raw_hours NUMERIC(4,2);
  net_hours NUMERIC(4,2);
  shift_end_time TIME;
  early_departure_flag BOOLEAN := FALSE;
  early_departure_mins INTEGER := 0;
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    raw_hours := ROUND((DATE_PART('EPOCH', NEW.check_out_time - NEW.check_in_time) / 3600.0)::numeric, 2);

    -- Look up shift details for this employee on this date
    SELECT s.end_time::time
    INTO shift_end_time
    FROM roster_assignments ra
    JOIN shifts s ON s.id = ra.shift_id
    WHERE ra.employee_id = NEW.employee_id
      AND ra.date = NEW.date
    LIMIT 1;

    -- Look up shift duration
    SELECT DATE_PART('EPOCH', (s.end_time::time - s.start_time::time)) / 3600.0
    INTO shift_duration_hours
    FROM roster_assignments ra
    JOIN shifts s ON s.id = ra.shift_id
    WHERE ra.employee_id = NEW.employee_id
      AND ra.date = NEW.date
    LIMIT 1;

    IF shift_duration_hours IS NULL OR shift_duration_hours <= 0 THEN
      shift_duration_hours := raw_hours;
    END IF;

    -- Detect early departure: if check_out is before shift end time
    IF shift_end_time IS NOT NULL THEN
      -- Convert check_out_time to time-only for comparison
      -- check_out_time is timestamptz, shift_end_time is time
      -- We need to compare just the time portion
      IF DATE_PART('EPOCH', NEW.check_out_time::time - shift_end_time) < 0 THEN
        early_departure_flag := TRUE;
        early_departure_mins := ABS(DATE_PART('EPOCH', NEW.check_out_time::time - shift_end_time) / 60)::INTEGER;
      END IF;
    END IF;

    IF shift_duration_hours > 6 THEN
      break_deduction := 1.0;
    END IF;

    net_hours := GREATEST(0, raw_hours - break_deduction);

    NEW.working_hours := raw_hours;
    NEW.break_deduction_hours := break_deduction;
    NEW.net_working_hours := ROUND(net_hours, 2);
    NEW.early_departure := early_departure_flag;
    NEW.early_departure_minutes := early_departure_mins;
  ELSE
    NEW.working_hours := NULL;
    NEW.break_deduction_hours := 0;
    NEW.net_working_hours := NULL;
    NEW.early_departure := FALSE;
    NEW.early_departure_minutes := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace the trigger
DROP TRIGGER IF EXISTS attendance_calculate_working_hours ON attendance;

CREATE TRIGGER attendance_calculate_working_hours
  BEFORE INSERT OR UPDATE OF check_in_time, check_out_time ON attendance
  FOR EACH ROW EXECUTE FUNCTION calculate_attendance_working_hours();

-- 4. Backfill existing records: set early_departure to FALSE for all existing records
UPDATE attendance
SET early_departure = FALSE,
    early_departure_minutes = 0
WHERE early_departure IS NULL;
