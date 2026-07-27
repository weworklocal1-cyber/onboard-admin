-- =============================================
-- Assets / Asset Management
-- =============================================

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'other',
  description text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(12, 2),
  current_value numeric(12, 2),
  condition_status text NOT NULL DEFAULT 'good',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  location text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_assets"
  ON assets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee'))
  );

CREATE POLICY "managers_write_assets"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "managers_update_assets"
  ON assets FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "admins_delete_assets"
  ON assets FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE OR REPLACE FUNCTION set_assets_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assets_updated_at ON assets;
CREATE TRIGGER trigger_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE PROCEDURE set_assets_updated_at();
