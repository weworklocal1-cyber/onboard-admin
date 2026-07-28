import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTaskEmail } from "../../../../email";

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

function canAccessTask(profile: { id: string; role: string }, task: { created_by: string; assigned_to: string }) {
  if (!task) return false;
  const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);
  if (isAdmin) return true;
  return task.created_by === profile.id || task.assigned_to === profile.id;
}

// POST /api/workforce/tasks/[id]/assignees/[assigneeId]/action
export async function POST(
  request: Request,
  { params }: { params: { id: string; assigneeId: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;
    const assigneeId = params.assigneeId;
    const body = await request.json();
    const { action, blocker_reason } = body as { action: string; blocker_reason?: string };

    if (!["accept", "complete", "block", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to, status, title, requires_approval, priority, blocker_reason, completed_at")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(sessionUser.role);
    if (!isAdmin && sessionUser.id !== assigneeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: assigneeRecord, error: assigneeError } = await supabaseAdmin
      .from("task_assignees")
      .select("id, status")
      .eq("task_id", taskId)
      .eq("employee_id", assigneeId)
      .maybeSingle();

    if (assigneeError || !assigneeRecord) {
      return NextResponse.json({ error: "Assignee record not found" }, { status: 404 });
    }

    let newAssigneeStatus = assigneeRecord.status;
    let historyAction = "";
    let historyNotes = "";

    switch (action) {
      case "accept":
        if (task.status === "todo") {
          newAssigneeStatus = "in_progress";
          historyAction = "accepted";
          historyNotes = "Task accepted and started";
        } else if (task.status === "blocked") {
          newAssigneeStatus = "in_progress";
          historyAction = "resumed";
          historyNotes = "Task resumed after being blocked";
        } else {
          return NextResponse.json({ error: "Task cannot be accepted in its current status" }, { status: 400 });
        }
        break;
      case "complete":
        if (task.status !== "in_progress") {
          return NextResponse.json({ error: "Task must be in progress to complete" }, { status: 400 });
        }
        newAssigneeStatus = "completed";
        historyAction = "completed";
        historyNotes = task.requires_approval ? "Task completed and sent for review" : "Task marked as complete";
        break;
      case "block":
        if (task.status !== "in_progress") {
          return NextResponse.json({ error: "Task must be in progress to block" }, { status: 400 });
        }
        newAssigneeStatus = "blocked";
        historyAction = "blocked";
        historyNotes = blocker_reason ? `Task blocked: ${blocker_reason}` : "Task blocked";
        break;
      case "decline":
        if (task.status !== "in_progress") {
          return NextResponse.json({ error: "Task must be in progress to decline" }, { status: 400 });
        }
        newAssigneeStatus = "blocked";
        historyAction = "declined";
        historyNotes = blocker_reason ? `Task declined: ${blocker_reason}` : "Task declined";
        break;
    }

    const now = new Date().toISOString();

    const { error: assigneeUpdateError } = await supabaseAdmin
      .from("task_assignees")
      .update({
        status: newAssigneeStatus,
        completed_at: newAssigneeStatus === "completed" ? now : null,
      })
      .eq("id", assigneeRecord.id);

    if (assigneeUpdateError) {
      return NextResponse.json({ error: assigneeUpdateError.message }, { status: 500 });
    }

    const { data: allAssignees, error: assigneesError } = await supabaseAdmin
      .from("task_assignees")
      .select("status")
      .eq("task_id", taskId);

    const statuses = (allAssignees || []).map((a: { status: string }) => a.status);
    let derivedTaskStatus = task.status;
    if (statuses.some((s: string) => s === "blocked")) {
      derivedTaskStatus = "blocked";
    } else if (statuses.every((s: string) => s === "completed")) {
      derivedTaskStatus = task.requires_approval ? "in_review" : "completed";
    } else if (statuses.some((s: string) => s === "in_progress")) {
      derivedTaskStatus = "in_progress";
    }

    const newTaskStatus = derivedTaskStatus;

    const { data: updatedTask, error: taskUpdateError } = await supabaseAdmin
      .from("tasks")
      .update({
        status: newTaskStatus,
        blocker_reason: action === "block" || action === "decline" ? (blocker_reason || task.blocker_reason) : task.blocker_reason,
        completed_at: newTaskStatus === "completed" ? now : (task.status === "completed" ? now : task.completed_at),
      })
      .eq("id", taskId)
      .select(`
        *,
        creator:profiles!created_by(id, full_name),
        assignees:task_assignees(
          id,
          status,
          completed_at,
          employee:profiles!employee_id(id, full_name)
        )
      `)
      .single();

    if (taskUpdateError || !updatedTask) {
      return NextResponse.json({ error: taskUpdateError?.message || "Failed to update task" }, { status: 500 });
    }

    await supabaseAdmin.from("task_history").insert({
      task_id: taskId,
      actor_id: sessionUser.id,
      action: historyAction,
      old_value: { status: task.status, assignee_status: assigneeRecord.status },
      new_value: { status: newTaskStatus, assignee_status: newAssigneeStatus },
      notes: historyNotes,
    });

    if (task.created_by && task.created_by !== sessionUser.id) {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: task.created_by,
        sender_id: sessionUser.id,
        type: "task_updated",
        title: `Task ${historyAction.charAt(0).toUpperCase() + historyAction.slice(1)}`,
        message: `Task "${task.title}" has been ${historyAction} by the assignee.`,
        data: { task_id: taskId, status: newTaskStatus },
        read: false,
      });

      const creator = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", task.created_by)
        .single();

      if (creator.data?.email) {
        await sendTaskEmail({
          to: creator.data.email,
          subject: `Task ${historyAction.charAt(0).toUpperCase() + historyAction.slice(1)}: ${task.title}`,
          taskTitle: task.title,
          taskId,
          recipientName: creator.data.full_name,
          action: historyAction as "assigned" | "blocked" | "approved" | "rejected" | "overdue" | "completed" | "in_review",
        });
      }
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
