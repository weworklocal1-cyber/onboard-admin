-- Fix task_assignees RLS infinite recursion
-- The policies in 027_task_assignees.sql reference `tasks` from within `task_assignees` policies,
-- which causes PostgREST recursion when the client queries task_assignees with joined tasks data.
-- Replace INSERT/UPDATE/DELETE policies with simple auth-based policies.
-- SELECT was already fixed in 029_fix_task_assignees_rls.sql.

DROP POLICY IF EXISTS "task_assignees_insert" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_update" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_delete" ON task_assignees;

-- Leads/admins can insert assignees (task creation is admin-only in the app)
CREATE POLICY "task_assignees_insert"
  ON task_assignees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

-- Employee can update own assignee record; admins can update any
CREATE POLICY "task_assignees_update"
  ON task_assignees FOR UPDATE
  USING (
    task_assignees.employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

-- Employee can delete own assignee record; admins can delete any
CREATE POLICY "task_assignees_delete"
  ON task_assignees FOR DELETE
  USING (
    task_assignees.employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );
