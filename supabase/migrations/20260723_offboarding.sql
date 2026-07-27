-- =============================================
-- Offboarding Workflows
-- =============================================

CREATE TABLE IF NOT EXISTS offboarding_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  description text,
  duration_days integer DEFAULT 14,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_offboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id uuid REFERENCES offboarding_programs(id) ON DELETE SET NULL,
  hr_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_working_date date,
  reason text DEFAULT 'resignation',
  resignation_letter_url text,
  status text NOT NULL DEFAULT 'initiated',
  progress integer NOT NULL DEFAULT 0,
  assets_returned boolean NOT NULL DEFAULT false,
  knowledge_transferred boolean NOT NULL DEFAULT false,
  access_revoked boolean NOT NULL DEFAULT false,
  final_settlement_pending boolean NOT NULL DEFAULT true,
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_offboarding_id uuid NOT NULL REFERENCES employee_offboarding(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exit_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_offboarding_id uuid NOT NULL REFERENCES employee_offboarding(id) ON DELETE CASCADE,
  conducted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  interview_date date,
  reason_for_leaving text,
  liked_most text,
  liked_least text,
  suggestions text,
  would_recommend boolean,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_offboarding_emp ON employee_offboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_eo ON offboarding_tasks(employee_offboarding_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_eo ON exit_interviews(employee_offboarding_id);

ALTER TABLE offboarding_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_read_offboarding_programs"
  ON offboarding_programs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_write_offboarding_programs"
  ON offboarding_programs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "hr_update_offboarding_programs"
  ON offboarding_programs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "employees_read_own_offboarding"
  ON employee_offboarding FOR SELECT
  USING (
    employee_id = auth.uid()
    OR hr_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_manage_offboarding"
  ON employee_offboarding FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_update_offboarding"
  ON employee_offboarding FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "employees_read_own_offboarding_tasks"
  ON offboarding_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employee_offboarding
      WHERE employee_offboarding.id = offboarding_tasks.employee_offboarding_id
      AND (employee_offboarding.employee_id = auth.uid() OR employee_offboarding.hr_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "hr_manage_offboarding_tasks"
  ON offboarding_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employee_offboarding
      WHERE employee_offboarding.id = offboarding_tasks.employee_offboarding_id
    )
  );

CREATE POLICY "hr_manage_exit_interviews"
  ON exit_interviews FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE OR REPLACE FUNCTION set_offboarding_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offboarding_programs_updated_at ON offboarding_programs;
CREATE TRIGGER trigger_offboarding_programs_updated_at BEFORE UPDATE ON offboarding_programs FOR EACH ROW EXECUTE PROCEDURE set_offboarding_updated_at();

DROP TRIGGER IF EXISTS trigger_employee_offboarding_updated_at ON employee_offboarding;
CREATE TRIGGER trigger_employee_offboarding_updated_at BEFORE UPDATE ON employee_offboarding FOR EACH ROW EXECUTE PROCEDURE set_offboarding_updated_at();

DROP TRIGGER IF EXISTS trigger_offboarding_tasks_updated_at ON offboarding_tasks;
CREATE TRIGGER trigger_offboarding_tasks_updated_at BEFORE UPDATE ON offboarding_tasks FOR EACH ROW EXECUTE PROCEDURE set_offboarding_updated_at();

DROP TRIGGER IF EXISTS trigger_exit_interviews_updated_at ON exit_interviews;
CREATE TRIGGER trigger_exit_interviews_updated_at BEFORE UPDATE ON exit_interviews FOR EACH ROW EXECUTE PROCEDURE set_offboarding_updated_at();
