-- Migration 026: Leave Requests Table
-- Run this BEFORE 021, 024, 025
-- This creates the base leave_requests table

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN (
    'casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'comp_off'
  )),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'cancelled'
  )),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_half_day BOOLEAN DEFAULT FALSE,
  half_day_period TEXT CHECK (half_day_period IN ('morning', 'afternoon')),
  medical_certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trigger_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_leave_requests_updated_at();

-- RLS Policies
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own leave requests
CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  USING (employee_id = auth.uid());

-- Employees can create their own leave requests
CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Admins can view all leave requests
CREATE POLICY "Admins can view all leave requests"
  ON leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

-- Admins can update leave requests (approve/reject)
CREATE POLICY "Admins can update leave requests"
  ON leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );
