-- =============================================
-- Schedule Requests (Employee-initiated with approval)
-- =============================================

CREATE TABLE IF NOT EXISTS schedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_leave boolean DEFAULT false,
  leave_type text,
  location text DEFAULT 'office',
  recurrence_pattern jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_requests_employee ON schedule_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON schedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_date ON schedule_requests(date);

ALTER TABLE schedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_requests_read ON schedule_requests FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
  OR employee_id = auth.uid()
);
CREATE POLICY schedule_requests_insert ON schedule_requests FOR insert WITH CHECK (
  employee_id = auth.uid()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee'))
);
CREATE POLICY schedule_requests_update ON schedule_requests FOR update USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE OR REPLACE FUNCTION set_schedule_requests_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schedule_requests_updated_at ON schedule_requests;
CREATE TRIGGER trigger_schedule_requests_updated_at BEFORE UPDATE ON schedule_requests FOR EACH ROW EXECUTE PROCEDURE set_schedule_requests_updated_at();
