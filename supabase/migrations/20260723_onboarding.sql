-- =============================================
-- Onboarding / Offboarding Workflows
-- =============================================

CREATE TABLE IF NOT EXISTS onboarding_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  description text,
  duration_days integer DEFAULT 30,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id uuid REFERENCES onboarding_programs(id) ON DELETE SET NULL,
  buddy_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress',
  progress integer NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_onboarding_id uuid NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_onboarding_emp ON employee_onboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_eo ON onboarding_tasks(employee_onboarding_id);

ALTER TABLE onboarding_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_read_programs"
  ON onboarding_programs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_write_programs"
  ON onboarding_programs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "hr_update_programs"
  ON onboarding_programs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "employees_read_own_onboarding"
  ON employee_onboarding FOR SELECT
  USING (
    employee_id = auth.uid()
    OR buddy_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_manage_onboarding"
  ON employee_onboarding FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_update_onboarding"
  ON employee_onboarding FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "employees_read_own_tasks"
  ON onboarding_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employee_onboarding
      WHERE employee_onboarding.id = onboarding_tasks.employee_onboarding_id
      AND (employee_onboarding.employee_id = auth.uid() OR employee_onboarding.buddy_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_manage_tasks"
  ON onboarding_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employee_onboarding
      WHERE employee_onboarding.id = onboarding_tasks.employee_onboarding_id
    )
  );

CREATE OR REPLACE FUNCTION set_onboarding_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_programs_updated_at ON onboarding_programs;
CREATE TRIGGER trigger_onboarding_programs_updated_at BEFORE UPDATE ON onboarding_programs FOR EACH ROW EXECUTE PROCEDURE set_onboarding_updated_at();

DROP TRIGGER IF EXISTS trigger_employee_onboarding_updated_at ON employee_onboarding;
CREATE TRIGGER trigger_employee_onboarding_updated_at BEFORE UPDATE ON employee_onboarding FOR EACH ROW EXECUTE PROCEDURE set_onboarding_updated_at();

DROP TRIGGER IF EXISTS trigger_onboarding_tasks_updated_at ON onboarding_tasks;
CREATE TRIGGER trigger_onboarding_tasks_updated_at BEFORE UPDATE ON onboarding_tasks FOR EACH ROW EXECUTE PROCEDURE set_onboarding_updated_at();
