-- Derive task status from task_assignees automatically
-- This removes the need for every client to manually recompute tasks.status
-- Business rules match src/app/api/workforce/tasks/[id]/assignees/[id]/action/route.ts:
--   1) any blocked       -> blocked
--   2) all completed     -> completed / in_review
--   3) any in_progress   -> in_progress
--   4) otherwise         -> todo

CREATE OR REPLACE FUNCTION derive_task_status_from_assignees()
RETURNS TRIGGER AS $$
DECLARE
  v_task_id UUID;
  v_task_requires_approval BOOLEAN;
  v_all_completed BOOLEAN;
  v_any_in_progress BOOLEAN;
  v_any_blocked BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_task_id := OLD.task_id;
  ELSE
    v_task_id := NEW.task_id;
  END IF;

  SELECT requires_approval INTO v_task_requires_approval
  FROM tasks
  WHERE id = v_task_id;

  SELECT
    bool_and(status = 'completed') INTO v_all_completed
  FROM task_assignees
  WHERE task_id = v_task_id;

  SELECT
    bool_or(status = 'in_progress') INTO v_any_in_progress
  FROM task_assignees
  WHERE task_id = v_task_id;

  SELECT
    bool_or(status = 'blocked') INTO v_any_blocked
  FROM task_assignees
  WHERE task_id = v_task_id;

  UPDATE tasks
  SET
    status = CASE
      WHEN v_any_blocked THEN 'blocked'
      WHEN v_all_completed THEN
        CASE WHEN COALESCE(v_task_requires_approval, false) THEN 'in_review' ELSE 'completed' END
      WHEN v_any_in_progress THEN 'in_progress'
      ELSE 'todo'
    END,
    updated_at = NOW()
  WHERE id = v_task_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_assignees_derive_task_status ON task_assignees;

CREATE TRIGGER task_assignees_derive_task_status
  AFTER INSERT OR UPDATE OR DELETE ON task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION derive_task_status_from_assignees();
