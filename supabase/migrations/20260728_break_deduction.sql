-- =============================================
-- Break Time Deduction for Attendance
-- =============================================

-- 1. Convert working_hours from generated column to regular column
-- First, drop the old generated column and recreate as regular
ALTER TABLE attendance DROP COLUMN IF EXISTS working_hours;

ALTER TABLE attendance ADD COLUMN working_hours DECIMAL(4,2);

-- 2. Add break_deduction_hours and net_working_hours columns
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_deduction_hours DECIMAL(4,2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS net_working_hours DECIMAL(4,2);

-- 3. Create function to calculate working hours with break deduction
CREATE OR REPLACE FUNCTION calculate_attendance_working_hours()
RETURNS TRIGGER AS $$
DECLARE
  shift_duration_hours NUMERIC(4,2) := 0;
  break_deduction NUMERIC(4,2) := 0;
  raw_hours NUMERIC(4,2);
  net_hours NUMERIC(4,2);
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    raw_hours := ROUND(EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0, 2);

    -- Look up shift duration for this employee on this date
    SELECT EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600.0
    INTO shift_duration_hours
    FROM roster_assignments ra
    JOIN shifts s ON s.id = ra.shift_id
    WHERE ra.employee_id = NEW.employee_id
      AND ra.date = NEW.date
    LIMIT 1;

    IF shift_duration_hours IS NULL OR shift_duration_hours <= 0 THEN
      shift_duration_hours := raw_hours;
    END IF;

    IF shift_duration_hours > 6 THEN
      break_deduction := 1.0;
    END IF;

    net_hours := GREATEST(0, raw_hours - break_deduction);

    NEW.working_hours := raw_hours;
    NEW.break_deduction_hours := break_deduction;
    NEW.net_working_hours := ROUND(net_hours, 2);
  ELSE
    NEW.working_hours := NULL;
    NEW.break_deduction_hours := 0;
    NEW.net_working_hours := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Replace the old trigger with the new one
DROP TRIGGER IF EXISTS attendance_calculate_working_hours ON attendance;

CREATE TRIGGER attendance_calculate_working_hours
  BEFORE INSERT OR UPDATE OF check_in_time, check_out_time ON attendance
  FOR EACH ROW EXECUTE FUNCTION calculate_attendance_working_hours();

-- 5. Backfill existing records
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id, employee_id, date, check_in_time, check_out_time FROM attendance WHERE check_in_time IS NOT NULL AND check_out_time IS NOT NULL LOOP
    UPDATE attendance
    SET working_hours = ROUND(EXTRACT(EPOCH FROM (rec.check_out_time - rec.check_in_time)) / 3600.0, 2),
        break_deduction_hours = 0,
        net_working_hours = ROUND(EXTRACT(EPOCH FROM (rec.check_out_time - rec.check_in_time)) / 3600.0, 2)
    WHERE id = rec.id;
  END LOOP;
END;
$$;
