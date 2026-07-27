-- =============================================
-- Settings / Integrations
-- =============================================

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  type text NOT NULL DEFAULT 'text',
  is_secret boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_read ON settings FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE POLICY settings_write ON settings FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE OR REPLACE FUNCTION set_settings_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON settings;
CREATE TRIGGER trigger_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE set_settings_updated_at();
