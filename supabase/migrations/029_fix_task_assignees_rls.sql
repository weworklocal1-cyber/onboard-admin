-- Fix task_assignees RLS so employees can see their own assignments
-- Run this AFTER 027_task_assignees.sql

DROP POLICY IF EXISTS "task_assignees_view" ON task_assignees;

CREATE POLICY "task_assignees_view"
  ON task_assignees FOR SELECT
  USING (
    task_assignees.employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

-- Backfill task_assignees from existing tasks.assigned_to
INSERT INTO task_assignees (task_id, employee_id, status, created_at, updated_at)
SELECT 
  t.id,
  t.assigned_to,
  t.status,
  t.created_at,
  t.updated_at
FROM tasks t
WHERE t.assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_assignees ta 
    WHERE ta.task_id = t.id AND ta.employee_id = t.assigned_to
  );
