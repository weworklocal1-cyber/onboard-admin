-- =============================================
-- 013_employment_types.sql
-- LocalWala Workforce Hub - Employment Types Lookup
-- =============================================

CREATE TABLE IF NOT EXISTS employment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_types_active ON employment_types(is_active);

CREATE TRIGGER employment_types_updated_at BEFORE UPDATE ON employment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
