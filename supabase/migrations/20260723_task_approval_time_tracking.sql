-- Migration: Task approval, quality workflows, time tracking, watchers, mentions, analytics

-- 1. Task approval / quality fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS quality_flag TEXT CHECK (quality_flag IN ('clean','needs_rework','blocked_quality','approved_with_comments'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billable_rate NUMERIC(10,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id UUID;

-- 2. Work logs per task
CREATE TABLE IF NOT EXISTS task_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  is_billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_work_logs_task ON task_work_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_work_logs_employee ON task_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_work_logs_date ON task_work_logs(log_date);

-- 3. Task watchers / followers
CREATE TABLE IF NOT EXISTS task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_employee ON task_watchers(employee_id);

-- 4. Mention notifications tracked in comments metadata
-- We'll use JSONB on task_comments to support mentions without schema change

-- 5. Projects / Sprints tables
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','archived')),
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  goal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS
ALTER TABLE task_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own work logs"
  ON task_work_logs FOR SELECT
  USING (auth.uid() = employee_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('founder','super_admin','hr_admin','team_lead')
  ));

CREATE POLICY "Users insert own work logs"
  ON task_work_logs FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users update own work logs"
  ON task_work_logs FOR UPDATE
  USING (auth.uid() = employee_id);

CREATE POLICY "Users read watchers for accessible tasks"
  ON task_watchers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_watchers.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
        AND role IN ('founder','super_admin','hr_admin','team_lead')))
  ));

CREATE POLICY "Users manage own watchers"
  ON task_watchers FOR INSERT
  WITH CHECK (auth.uid() = task_watchers.employee_id);

CREATE POLICY "Users remove own watchers"
  ON task_watchers FOR DELETE
  USING (auth.uid() = task_watchers.employee_id);

CREATE POLICY "Project members read projects"
  ON projects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('founder','super_admin','hr_admin','team_lead')
  ));

CREATE POLICY "Project creators manage projects"
  ON projects FOR ALL
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('founder','super_admin','hr_admin')
  ));

CREATE POLICY "Project members read sprints"
  ON sprints FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = sprints.project_id
    AND (projects.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('founder','super_admin','hr_admin','team_lead')
    ))
  ));

CREATE POLICY "Project creators manage sprints"
  ON sprints FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = sprints.project_id
    AND (projects.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('founder','super_admin','hr_admin')
    ))
  ));
