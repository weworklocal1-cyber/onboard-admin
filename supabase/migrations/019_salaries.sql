-- Migration 019: Salaries Table
-- Run this in your Supabase dashboard SQL editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Earnings
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  hra NUMERIC(12,2) DEFAULT 0,
  special_allowance NUMERIC(12,2) DEFAULT 0,
  performance_bonus NUMERIC(12,2) DEFAULT 0,
  travel_allowance NUMERIC(12,2) DEFAULT 0,
  medical_allowance NUMERIC(12,2) DEFAULT 0,
  other_allowances NUMERIC(12,2) DEFAULT 0,

  -- Deductions
  pf_employee NUMERIC(12,2) DEFAULT 0,
  pf_employer NUMERIC(12,2) DEFAULT 0,
  professional_tax NUMERIC(12,2) DEFAULT 0,
  tds NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,

  -- Net
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Meta
  payment_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'weekly', 'bi_weekly', 'one_time')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revised', 'inactive')),
  perks TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by employee
CREATE INDEX IF NOT EXISTS idx_salaries_employee_id ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_status ON salaries(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_salaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_salaries_updated_at ON salaries;
CREATE TRIGGER trigger_salaries_updated_at
  BEFORE UPDATE ON salaries
  FOR EACH ROW EXECUTE FUNCTION update_salaries_updated_at();

-- RLS Policies
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all salaries"
  ON salaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('founder', 'super_admin', 'hr_admin')
    )
  );

-- Employees can view their own salary
CREATE POLICY "Employees can view their own salary"
  ON salaries FOR SELECT
  USING (employee_id = auth.uid());
