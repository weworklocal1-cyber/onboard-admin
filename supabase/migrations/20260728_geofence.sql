-- =============================================
-- Geofence Configuration for Attendance
-- =============================================

CREATE TABLE IF NOT EXISTS attendance_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Office',
  address TEXT,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_geofences_active ON attendance_geofences(is_active);

ALTER TABLE attendance_geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage geofences"
  ON attendance_geofences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

CREATE POLICY "Employees can read geofences"
  ON attendance_geofences FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_attendance_geofences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attendance_geofences_updated_at ON attendance_geofences;
CREATE TRIGGER trigger_attendance_geofences_updated_at
  BEFORE UPDATE ON attendance_geofences
  FOR EACH ROW EXECUTE FUNCTION update_attendance_geofences_updated_at();

-- Seed default office location (can be updated later)
INSERT INTO attendance_geofences (name, address, latitude, longitude, radius_meters, is_active, created_by)
SELECT 'Main Office', 'Madhapur, Hyderabad, Telangana, India - 500081', 17.448294, 78.391487, 200, TRUE, id
FROM profiles
WHERE role = 'founder'
LIMIT 1
ON CONFLICT DO NOTHING;
