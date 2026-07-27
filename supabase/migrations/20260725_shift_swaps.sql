-- =============================================
-- Shift Swap Requests & Coverage Tracking
-- =============================================

CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES roster_assignments(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES roster_assignments(id) ON DELETE CASCADE,
  covered_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swap_requests_assignment ON shift_swap_requests(assignment_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requested_by ON shift_swap_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_coverage_assignment ON shift_coverage(assignment_id);
CREATE INDEX IF NOT EXISTS idx_coverage_covered_by ON shift_coverage(covered_by);

ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_swap_read" ON shift_swap_requests FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY "shift_swap_write" ON shift_swap_requests FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE POLICY "shift_coverage_read" ON shift_coverage FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY "shift_coverage_write" ON shift_coverage FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE OR REPLACE FUNCTION set_swap_requests_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_swap_requests_updated_at ON shift_swap_requests;
CREATE TRIGGER trigger_swap_requests_updated_at BEFORE UPDATE ON shift_swap_requests FOR EACH ROW EXECUTE FUNCTION set_swap_requests_updated_at();

CREATE OR REPLACE FUNCTION set_coverage_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coverage_updated_at ON shift_coverage;
CREATE TRIGGER trigger_coverage_updated_at BEFORE UPDATE ON shift_coverage FOR EACH ROW EXECUTE FUNCTION set_coverage_updated_at();
