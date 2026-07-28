-- Auto-detect half-day when net working hours >= 4 and < 8
-- Explicit statuses (absent/on_leave/wfh/late/half_day) are preserved
-- Defaults to absent when no check-in/out exists

-- 1. Ensure required columns exist
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS working_hours DECIMAL(4,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_deduction_hours DECIMAL(4,2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS net_working_hours DECIMAL(4,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_departure BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_departure_minutes INTEGER DEFAULT 0;

-- 2. Create/replace trigger function with half-day auto-detection
CREATE OR REPLACE FUNCTION calculate_attendance_working_hours()
RETURNS TRIGGER AS $$
DECLARE
  shift_start TIME;
  shift_end TIME;
  shift_duration_hours NUMERIC(4,2) := 0;
  break_deduction NUMERIC(4,2) := 0;
  raw_hours NUMERIC(4,2);
  net_hours NUMERIC(4,2);
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    raw_hours := ROUND(EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0, 2);

    -- Look up shift start/end for this employee on this date
    SELECT s.start_time::time, s.end_time::time
    INTO shift_start, shift_end
    FROM roster_assignments ra
    JOIN shifts s ON s.id = ra.shift_id
    WHERE ra.employee_id = NEW.employee_id
      AND ra.date = NEW.date
    LIMIT 1;

    IF shift_start IS NULL THEN
      shift_start := '10:00:00'::TIME;
    END IF;
    IF shift_end IS NULL THEN
      shift_end := '19:00:00'::TIME;
    END IF;

    shift_duration_hours := EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600.0;

    -- Break deduction: 1 hour if shift > 6 hours
    IF shift_duration_hours > 6 THEN
      break_deduction := 1.0;
    END IF;

    -- Look up actual break time from attendance_breaks table
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM duration)), 0) / 60.0
    INTO break_deduction
    FROM attendance_breaks
    WHERE attendance_id = NEW.id
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL;

    net_hours := GREATEST(0, raw_hours - break_deduction);

    NEW.working_hours := raw_hours;
    NEW.break_deduction_hours := ROUND(break_deduction, 2);
    NEW.net_working_hours := ROUND(net_hours, 2);

    -- Half-day auto-detection
    IF NEW.net_working_hours >= 4 AND NEW.net_working_hours < 8 THEN
      IF NEW.status NOT IN ('absent', 'on_leave', 'wfh', 'late', 'half_day') THEN
        NEW.status := 'half_day';
      END IF;
    ELSIF NEW.net_working_hours >= 8 AND NEW.status = 'half_day' THEN
      NEW.status := 'present';
    END IF;

    -- Early departure detection
    IF shift_duration_hours > 0 AND NEW.check_out_time::TIME > shift_end THEN
      NEW.early_departure := FALSE;
      NEW.early_departure_minutes := 0;
    ELSIF shift_duration_hours > 0 AND NEW.check_out_time::TIME < shift_end THEN
      NEW.early_departure := TRUE;
      NEW.early_departure_minutes := GREATEST(ROUND(EXTRACT(EPOCH FROM (shift_end - NEW.check_out_time::TIME)) / 60.0), 0);
    END IF;
  ELSE
    NEW.working_hours := 0;
    NEW.break_deduction_hours := 0;
    NEW.net_working_hours := 0;
    IF NEW.status IS NULL THEN
      NEW.status := 'absent';
    END IF;
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
