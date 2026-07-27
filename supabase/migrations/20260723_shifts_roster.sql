-- =============================================
-- Shift / Roster Management
-- =============================================

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roster_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, shift_id, date)
);

CREATE INDEX IF NOT EXISTS idx_roster_assignments_employee ON roster_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_date ON roster_assignments(date);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_shift ON roster_assignments(shift_id);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY shifts_read ON shifts FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY shifts_write ON shifts FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE POLICY roster_read ON roster_assignments FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY roster_write ON roster_assignments FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE OR REPLACE FUNCTION set_shifts_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shifts_updated_at ON shifts;
CREATE TRIGGER trigger_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE PROCEDURE set_shifts_updated_at();

CREATE OR REPLACE FUNCTION set_roster_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_roster_assignments_updated_at ON roster_assignments;
CREATE TRIGGER trigger_roster_assignments_updated_at BEFORE UPDATE ON roster_assignments FOR EACH ROW EXECUTE PROCEDURE set_roster_updated_at();
