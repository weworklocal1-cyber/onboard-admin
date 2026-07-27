-- =============================================
-- Meeting Notes / Stand-ups
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  meeting_type text NOT NULL DEFAULT 'standup',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_note_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_note_id uuid NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_note_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_date ON meeting_notes(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_type ON meeting_notes(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_creator ON meeting_notes(created_by);

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_note_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_notes_read ON meeting_notes FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY meeting_notes_write ON meeting_notes FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE POLICY meeting_note_participants_read ON meeting_note_participants FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY meeting_note_participants_write ON meeting_note_participants FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE OR REPLACE FUNCTION set_meeting_notes_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meeting_notes_updated_at ON meeting_notes;
CREATE TRIGGER trigger_meeting_notes_updated_at BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE PROCEDURE set_meeting_notes_updated_at();
