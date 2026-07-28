-- =============================================
-- Attendance Breaks Table
-- =============================================

CREATE TABLE IF NOT EXISTS attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration DECIMAL(4,2),
  break_type TEXT DEFAULT 'lunch',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attendance_id, start_time)
);

CREATE INDEX IF NOT EXISTS idx_attendance_breaks_attendance ON attendance_breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_employee_date ON attendance_breaks(employee_id, date);

ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can read own breaks" ON attendance_breaks;
DROP POLICY IF EXISTS "Employees can insert own breaks" ON attendance_breaks;
DROP POLICY IF EXISTS "Employees can update own breaks" ON attendance_breaks;
DROP POLICY IF EXISTS "Employees can delete own breaks" ON attendance_breaks;
DROP POLICY IF EXISTS "Admins can manage all breaks" ON attendance_breaks;

CREATE POLICY "Employees can read own breaks"
  ON attendance_breaks FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can insert own breaks"
  ON attendance_breaks FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own breaks"
  ON attendance_breaks FOR UPDATE
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can delete own breaks"
  ON attendance_breaks FOR DELETE
  USING (auth.uid() = employee_id);

CREATE POLICY "Admins can manage all breaks"
  ON attendance_breaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.duration := ROUND(DATE_PART('EPOCH', NEW.end_time - NEW.start_time) / 60.0, 2);
  ELSE
    NEW.duration := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_break_duration_trigger ON attendance_breaks;

CREATE TRIGGER calculate_break_duration_trigger
  BEFORE INSERT OR UPDATE OF start_time, end_time ON attendance_breaks
  FOR EACH ROW EXECUTE FUNCTION calculate_break_duration();

DROP TRIGGER IF EXISTS attendance_breaks_updated_at ON attendance_breaks;
CREATE TRIGGER attendance_breaks_updated_at
  BEFORE UPDATE ON attendance_breaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
