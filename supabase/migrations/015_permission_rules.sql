-- =============================================
-- 015_permission_rules.sql
-- LocalWala Workforce Hub - Permission Groups
-- =============================================

CREATE TABLE IF NOT EXISTS permission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL UNIQUE,
  role_names TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_rules_group ON permission_rules(group_name);

CREATE TRIGGER permission_rules_updated_at BEFORE UPDATE ON permission_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
