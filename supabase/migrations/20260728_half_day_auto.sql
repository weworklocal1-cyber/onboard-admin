-- =============================================
-- Half-Day Auto-Detection for Attendance
-- =============================================

-- Update the trigger function to auto-detect half_day status
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
  computed_status TEXT;
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    raw_hours := ROUND(EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0, 2);

    -- Look up shift details for this employee on this date
    SELECT s.end_time::time
    INTO shift_end_time
    FROM roster_assignments ra
    JOIN shifts s ON s.id = ra.shift_id
    WHERE ra.employee_id = NEW.employee_id
      AND ra.date = NEW.date
    LIMIT 1;

    -- Look up shift duration
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

    -- Detect early departure
    IF shift_end_time IS NOT NULL THEN
      IF EXTRACT(EPOCH FROM (NEW.check_out_time::time - shift_end_time)) < 0 THEN
        early_departure_flag := TRUE;
        early_departure_mins := ABS(EXTRACT(EPOCH FROM (NEW.check_out_time::time - shift_end_time)) / 60)::INTEGER;
      END IF;
    END IF;

    -- Break deduction: 1 hour if shift > 6 hours
    IF shift_duration_hours > 6 THEN
      break_deduction := 1.0;
    END IF;

    net_hours := GREATEST(0, raw_hours - break_deduction);

    NEW.working_hours := raw_hours;
    NEW.break_deduction_hours := break_deduction;
    NEW.net_working_hours := ROUND(net_hours, 2);
    NEW.early_departure := early_departure_flag;
    NEW.early_departure_minutes := early_departure_mins;

    -- Auto-detect half_day: net hours between 4 and 8 hours
    -- Only auto-set if status is not already explicitly set to something else
    IF NEW.net_working_hours >= 4 AND NEW.net_working_hours < 8 THEN
      computed_status := 'half_day';
    ELSE
      computed_status := NEW.status;
    END IF;

    -- Override computed_status if status is explicitly set to something meaningful
    IF NEW.status IN ('absent', 'on_leave', 'wfh', 'late') THEN
      computed_status := NEW.status;
    ELSIF NEW.status = 'half_day' THEN
      computed_status := 'half_day';
    ELSIF NEW.net_working_hours IS NULL OR NEW.net_working_hours = 0 THEN
      computed_status := 'absent';
    END IF;

    NEW.status := computed_status;
  ELSE
    NEW.working_hours := NULL;
    NEW.break_deduction_hours := 0;
    NEW.net_working_hours := NULL;
    NEW.early_departure := FALSE;
    NEW.early_departure_minutes := 0;
    NEW.status := COALESCE(NEW.status, 'absent');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the trigger
DROP TRIGGER IF EXISTS attendance_calculate_working_hours ON attendance;

CREATE TRIGGER attendance_calculate_working_hours
  BEFORE INSERT OR UPDATE OF check_in_time, check_out_time ON attendance
  FOR EACH ROW EXECUTE FUNCTION calculate_attendance_working_hours();
