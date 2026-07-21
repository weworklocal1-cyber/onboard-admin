-- Migration 023: Task History / Audit Log
-- Run this in your Supabase dashboard SQL editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'status_changed', 'assigned', 'reassigned',
    'priority_changed', 'due_date_changed', 'description_changed',
    'blocked', 'unblocked', 'completed', 'comment_added',
    'attachment_added', 'attachment_removed'
  )),
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_actor_id ON task_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);

-- RLS Policies
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Task creator, assignee, and admins can view history
DROP POLICY IF EXISTS "task_history_view" ON task_history;
CREATE POLICY "task_history_view"
  ON task_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_history.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

-- Only task creator, assignee, and admins can insert history
DROP POLICY IF EXISTS "task_history_insert" ON task_history;
CREATE POLICY "task_history_insert"
  ON task_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_history.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );
