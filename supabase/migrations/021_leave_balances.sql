-- Migration 021: Leave Balances + Teams Notification Tracking
-- Run this in your Supabase dashboard SQL editor or via Supabase CLI

-- =============================================
-- LEAVE BALANCES
-- =============================================

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN (
    'casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'comp_off'
  )),
  total_allocated NUMERIC(5,2) NOT NULL DEFAULT 0,
  used NUMERIC(5,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(5,2) GENERATED ALWAYS AS (total_allocated - used) STORED,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, leave_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type ON leave_balances(leave_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leave_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER trigger_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_leave_balances_updated_at();

-- RLS Policies
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Admins can manage all leave balances
CREATE POLICY "Admins can manage all leave balances"
  ON leave_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('founder', 'super_admin', 'hr_admin')
    )
  );

-- Employees can view their own leave balances
CREATE POLICY "Employees can view their own leave balances"
  ON leave_balances FOR SELECT
  USING (employee_id = auth.uid());

-- Team leads can view their team's leave balances
CREATE POLICY "Team leads can view their team's leave balances"
  ON leave_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
        AND reporting_manager_id = (
          SELECT reporting_manager_id FROM profiles WHERE id = leave_balances.employee_id
        )
    )
  );

-- =============================================
-- NOTIFICATIONS: Add teams_sent tracking column
-- =============================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS teams_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_teams_sent ON notifications(teams_sent) WHERE teams_sent = FALSE;

-- =============================================
-- SEED: Default leave balances for existing active employees
-- =============================================

INSERT INTO leave_balances (employee_id, leave_type, total_allocated, effective_from)
SELECT 
  p.id,
  'casual',
  12,
  CURRENT_DATE
FROM profiles p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = p.id AND lb.leave_type = 'casual'
  );

INSERT INTO leave_balances (employee_id, leave_type, total_allocated, effective_from)
SELECT 
  p.id,
  'sick',
  10,
  CURRENT_DATE
FROM profiles p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = p.id AND lb.leave_type = 'sick'
  );

INSERT INTO leave_balances (employee_id, leave_type, total_allocated, effective_from)
SELECT 
  p.id,
  'earned',
  15,
  CURRENT_DATE
FROM profiles p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = p.id AND lb.leave_type = 'earned'
  );
