import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return profile;
}

function isManager(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

// POST /api/workforce/tasks/bulk
export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManager(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden: only managers can perform bulk actions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, task_ids, value } = body;

    if (!action || !task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json({ error: "Action and task_ids array are required" }, { status: 400 });
    }

    if (task_ids.length > 100) {
      return NextResponse.json({ error: "Maximum 100 tasks per bulk operation" }, { status: 400 });
    }

    switch (action) {
      case "delete": {
        const { error } = await supabaseAdmin
          .from("tasks")
          .delete()
          .in("id", task_ids);

        if (error) throw error;
        return NextResponse.json({ success: true, deleted: task_ids.length });
      }

      case "status": {
        if (!value) {
          return NextResponse.json({ error: "Status value is required" }, { status: 400 });
        }

        const { data: tasks, error: fetchError } = await supabaseAdmin
          .from("tasks")
          .select("id, requires_approval")
          .in("id", task_ids);

        if (fetchError) throw fetchError;

        const updates = (tasks || []).map((task: any) => {
          const statusToSet = value === "completed" && task.requires_approval ? "in_review" : value;

          return {
            id: task.id,
            status: statusToSet,
            ...(statusToSet === "completed" ? { completed_at: new Date().toISOString() } : {}),
          };
        });

        for (const update of updates) {
          await supabaseAdmin
            .from("tasks")
            .update({ status: update.status, completed_at: update.completed_at })
            .eq("id", update.id);
        }

        return NextResponse.json({ success: true, updated: task_ids.length });
      }

      case "priority": {
        if (!value) {
          return NextResponse.json({ error: "Priority value is required" }, { status: 400 });
        }

        const { error: priorityError } = await supabaseAdmin
          .from("tasks")
          .update({ priority: value })
          .in("id", task_ids);

        if (priorityError) throw priorityError;
        return NextResponse.json({ success: true, updated: task_ids.length });
      }

      case "reassign": {
        if (!value) {
          return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
        }

        const { error: assigneeError } = await supabaseAdmin
          .from("tasks")
          .update({ assigned_to: value })
          .in("id", task_ids);

        if (assigneeError) throw assigneeError;

        const { data: profileData } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", value)
          .single();

        for (const taskId of task_ids) {
          await supabaseAdmin.from("task_assignees").upsert(
            { task_id: taskId, employee_id: value, status: "pending" },
            { onConflict: "task_id,employee_id" }
          );
        }

        return NextResponse.json({ success: true, reassigned: task_ids.length });
      }

      case "export": {
        const query = supabaseAdmin
          .from("tasks")
          .select(`
            id, title, description, status, priority, due_date,
            estimated_hours, actual_hours, created_at, department,
            creator:profiles!created_by(full_name),
            assignees:task_assignees(
              employee_id,
              status,
              employee:profiles!employee_id(full_name)
            )
          `)
          .in("id", task_ids);

        const { data: tasks, error: exportError } = await query;
        if (exportError) throw exportError;

        return NextResponse.json({ success: true, tasks: tasks || [] });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
