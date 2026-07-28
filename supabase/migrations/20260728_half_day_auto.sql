-- Auto-detect half-day when net working hours >= 4 and < 8
-- Explicit statuses (absent/on_leave/wfh/late/half_day) are preserved
-- Defaults to absent when no check-in/out exists

CREATE OR REPLACE FUNCTION calculate_attendance_working_hours()
RETURNS TRIGGER AS $$
DECLARE
  shift_start TIME;
  shift_end TIME;
  shift_duration DECIMAL;
  work_minutes DECIMAL;
  break_minutes INTEGER;
  gross_hours DECIMAL;
  net_hours DECIMAL;
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    shift_start := COALESCE(NEW.shift_start_time, '10:00:00'::TIME);
    shift_end := COALESCE(NEW.shift_end_time, '19:00:00'::TIME);
    shift_duration := EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600.0;

    work_minutes := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60.0;

    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM duration)), 0) / 60.0
    INTO break_minutes
    FROM attendance_breaks
    WHERE attendance_id = NEW.id
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL;

    gross_hours := work_minutes / 60.0;
    net_hours := GREATEST((work_minutes - break_minutes) / 60.0, 0);

    NEW.working_hours := ROUND(gross_hours::NUMERIC, 2);
    NEW.break_deduction_hours := ROUND((break_minutes / 60.0)::NUMERIC, 2);
    NEW.net_working_hours := ROUND(net_hours::NUMERIC, 2);

    IF NEW.net_working_hours >= 4 AND NEW.net_working_hours < 8 THEN
      IF NEW.status NOT IN ('absent', 'on_leave', 'wfh', 'late', 'half_day') THEN
        NEW.status := 'half_day';
      END IF;
    ELSIF NEW.net_working_hours >= 8 AND NEW.status = 'half_day' THEN
      NEW.status := 'present';
    END IF;

    IF shift_duration > 0 AND NEW.check_out_time::TIME > shift_end THEN
      NEW.early_departure := FALSE;
      NEW.early_departure_minutes := 0;
    ELSIF shift_duration > 0 AND NEW.check_out_time::TIME < shift_end THEN
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
