-- =============================================
-- Corporate Scheduling Enhancements
-- Recurrence, Leave, Location, Shift Templates
-- =============================================

-- 1. Extend roster_assignments
ALTER TABLE roster_assignments
  ADD COLUMN IF NOT EXISTS recurrence_pattern jsonb,
  ADD COLUMN IF NOT EXISTS parent_assignment_id uuid REFERENCES roster_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_leave boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS leave_type text,
  ADD COLUMN IF NOT EXISTS location text DEFAULT 'office';

CREATE INDEX IF NOT EXISTS idx_roster_assignments_parent ON roster_assignments(parent_assignment_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_is_leave ON roster_assignments(is_leave);

-- 2. Shift templates
CREATE TABLE IF NOT EXISTS shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_templates_created_by ON shift_templates(created_by);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_templates_read ON shift_templates FOR select USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee'))
);
CREATE POLICY shift_templates_write ON shift_templates FOR all USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
);

CREATE OR REPLACE FUNCTION set_shift_templates_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shift_templates_updated_at ON shift_templates;
CREATE TRIGGER trigger_shift_templates_updated_at BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE PROCEDURE set_shift_templates_updated_at();

-- 3. Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read, created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_read ON notifications FOR select USING (recipient_id = auth.uid());
CREATE POLICY notifications_insert ON notifications FOR insert WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
);
