-- =============================================
-- Performance Improvement Plans (PIP)
-- =============================================

CREATE TABLE IF NOT EXISTS performance_improvement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  outcome text NOT NULL DEFAULT 'in_progress',
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pip_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pip_id uuid NOT NULL REFERENCES performance_improvement_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_employee ON performance_improvement_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_milestones ON pip_milestones(pip_id);

ALTER TABLE performance_improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_manage_pip"
  ON performance_improvement_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "employee_read_own_pip"
  ON performance_improvement_plans FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "hr_manage_milestones"
  ON pip_milestones FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "employee_read_own_milestones"
  ON pip_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM performance_improvement_plans 
      WHERE performance_improvement_plans.id = pip_milestones.pip_id 
      AND performance_improvement_plans.employee_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION set_pip_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pip_updated_at ON performance_improvement_plans;
CREATE TRIGGER trigger_pip_updated_at BEFORE UPDATE ON performance_improvement_plans FOR EACH ROW EXECUTE PROCEDURE set_pip_updated_at();
