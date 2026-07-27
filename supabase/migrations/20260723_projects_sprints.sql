-- =============================================
-- Projects & Sprints
-- =============================================

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_read ON projects FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY projects_write ON projects FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE POLICY sprints_read ON sprints FOR select USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead', 'employee')
);
CREATE POLICY sprints_write ON sprints FOR all USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
);

CREATE OR REPLACE FUNCTION set_projects_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE set_projects_updated_at();

CREATE OR REPLACE FUNCTION set_sprints_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sprints_updated_at ON sprints;
CREATE TRIGGER trigger_sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE PROCEDURE set_sprints_updated_at();
