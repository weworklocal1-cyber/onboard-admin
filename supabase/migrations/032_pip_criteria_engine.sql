-- =============================================
-- PIP Auto-Criteria Engine
-- =============================================

CREATE TABLE IF NOT EXISTS pip_criteria_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  metric_type text NOT NULL,
  threshold_value numeric NOT NULL,
  threshold_unit text NOT NULL,
  comparison text NOT NULL DEFAULT 'less_than',
  window_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pip_auto_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES pip_criteria_rules(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  description text NOT NULL,
  current_value numeric NOT NULL,
  threshold_value numeric NOT NULL,
  threshold_unit text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_auto_flags_employee ON pip_auto_flags(employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_auto_flags_status ON pip_auto_flags(status);

ALTER TABLE pip_criteria_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_auto_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_manage_pip_rules"
  ON pip_criteria_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "founder_read_pip_flags"
  ON pip_auto_flags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "founder_manage_pip_flags"
  ON pip_auto_flags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "employee_read_own_flags"
  ON pip_auto_flags FOR SELECT
  USING (employee_id = auth.uid());

CREATE OR REPLACE FUNCTION set_pip_rule_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pip_rule_updated_at ON pip_criteria_rules;
CREATE TRIGGER trigger_pip_rule_updated_at BEFORE UPDATE ON pip_criteria_rules FOR EACH ROW EXECUTE PROCEDURE set_pip_rule_updated_at();

-- Seed default rules
INSERT INTO pip_criteria_rules (rule_name, description, metric_type, threshold_value, threshold_unit, comparison, window_days) VALUES
  ('Low Attendance', 'Attendance rate below threshold in rolling window', 'attendance_rate', 75, 'percent', 'less_than', 30),
  ('Excessive Absenteeism', 'Number of absent days exceeds threshold in window', 'absent_days', 5, 'days', 'greater_than', 30),
  ('Frequent Late Arrivals', 'Late arrivals exceed threshold in window', 'late_days', 5, 'days', 'greater_than', 30),
  ('Task Overdue', 'Overdue tasks exceed threshold', 'overdue_tasks', 3, 'count', 'greater_than', 14),
  ('Task Blocked', 'Blocked tasks exceed threshold', 'blocked_tasks', 2, 'count', 'greater_than', 14),
  ('Daily Update Missing', 'Missed daily updates exceed threshold in window', 'missed_updates', 3, 'days', 'greater_than', 14),
  ('Unresolved Blockers', 'Blockers unresolved for more than N days', 'unresolved_blockers', 3, 'days', 'greater_than', 7)
ON CONFLICT DO NOTHING;
