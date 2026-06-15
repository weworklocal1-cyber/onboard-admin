-- =============================================
-- 001_profiles.sql
-- LocalWala Workforce Hub - Core User Profiles
-- =============================================

-- Auto-generate employee IDs: LW-2025-001
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL DEFAULT ('LW-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('employee_id_seq')::TEXT, 3, '0')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  employment_type TEXT DEFAULT 'full_time',
  role TEXT NOT NULL DEFAULT 'employee',
  status TEXT DEFAULT 'active',
  reporting_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joining_date DATE DEFAULT CURRENT_DATE,
  profile_picture_url TEXT,
  work_location TEXT DEFAULT 'office',
  emergency_contact TEXT,
  aadhaar_number TEXT,
  pan_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_reporting_manager ON profiles(reporting_manager_id);

-- HR Documents table
CREATE TABLE IF NOT EXISTS hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON hr_documents(employee_id);
