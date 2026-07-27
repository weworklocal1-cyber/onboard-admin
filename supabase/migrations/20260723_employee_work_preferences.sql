-- =============================================
-- Employee Work Preferences / Interns Day Rules
-- =============================================

CREATE TABLE IF NOT EXISTS employee_work_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_type text NOT NULL DEFAULT 'full_time',
  days_per_week integer NOT NULL DEFAULT 5,
  preferred_shift_start text,
  preferred_shift_end text,
  working_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_work_prefs_emp ON employee_work_preferences(employee_id);

ALTER TABLE employee_work_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_read_own_prefs"
  ON employee_work_preferences FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_manage_prefs"
  ON employee_work_preferences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE OR REPLACE FUNCTION set_employee_work_prefs_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employee_work_prefs_updated_at ON employee_work_preferences;
CREATE TRIGGER trigger_employee_work_prefs_updated_at BEFORE UPDATE ON employee_work_preferences FOR EACH ROW EXECUTE PROCEDURE set_employee_work_prefs_updated_at();
