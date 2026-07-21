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

// DELETE /api/workforce/tasks/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;

    // Fetch task to check permissions
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, title")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Permission check: creator, assignee, or lead+ can delete
    const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(sessionUser.role);
    const isCreator = task.created_by === sessionUser.id;
    
    // Check if user is an assignee via task_assignees table
    const { data: assigneeRecord } = await supabaseAdmin
      .from("task_assignees")
      .select("id")
      .eq("task_id", taskId)
      .eq("employee_id", sessionUser.id)
      .maybeSingle();
    
    const isAssignee = !!assigneeRecord;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Log deletion in history before deleting
    await supabaseAdmin.from("task_history").insert({
      task_id: taskId,
      actor_id: sessionUser.id,
      action: "deleted",
      old_value: { title: task.title, status: "deleted" },
      new_value: null,
      notes: "Task deleted",
    });

    const { error: deleteError } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
