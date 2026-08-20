import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTaskEmail } from "../email";
import { logAudit } from "@/lib/audit";

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

// PUT /api/workforce/tasks/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;
    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      due_date,
      assigned_to,
      blocker_reason,
      actual_hours,
      completion_notes,
      requires_approval,
      quality_flag,
      billable,
      billable_rate,
      project_id,
      sprint_id,
    } = body;

    // Fetch existing task
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to, status, title, description, priority, due_date, actual_hours, blocker_reason, completion_notes, requires_approval, quality_flag, billable, billable_rate, project_id, sprint_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oldStatus = task.status;
    const normalizedStatus = status ?? task.status;
    const finalStatus =
      normalizedStatus === "completed" && task.requires_approval
        ? "in_review"
        : normalizedStatus;

    const updateData: Record<string, unknown> = {
      title: title ?? task.title,
      description: description ?? task.description,
      priority: priority ?? task.priority,
      status: finalStatus,
      due_date: due_date ?? task.due_date,
      actual_hours: actual_hours ?? task.actual_hours,
      blocker_reason: blocker_reason ?? task.blocker_reason,
      completion_notes: completion_notes ?? task.completion_notes,
      requires_approval: requires_approval ?? task.requires_approval,
      quality_flag: quality_flag ?? task.quality_flag,
      billable: billable ?? task.billable,
      billable_rate: billable_rate ?? task.billable_rate,
      project_id: project_id ?? task.project_id,
      sprint_id: sprint_id ?? task.sprint_id,
    };

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }

    if (finalStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from("tasks")
      .update(updateData)
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

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (finalStatus === "in_review") {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: task.created_by,
        sender_id: sessionUser.id,
        type: "task_updated",
        title: "Task Sent for Review",
        message: `Task "${task.title}" requires approval before it is marked complete.`,
        data: { task_id: taskId, status: finalStatus },
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
          subject: `Task Sent for Review: ${task.title}`,
          taskTitle: task.title,
          taskId,
          recipientName: creator.data.full_name,
          action: "in_review",
        });
      }
    }

    if (status && status !== oldStatus) {
      await logAudit(
        "task_status_change",
        "tasks",
        taskId,
        { status: oldStatus },
        { status: finalStatus },
        sessionUser.id
      );

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        actor_id: sessionUser.id,
        action: "status_changed",
        old_value: { status: oldStatus },
        new_value: { status: finalStatus },
        notes: `Status changed from ${oldStatus} to ${finalStatus}`,
      });

      if (status === "blocked") {
        await supabaseAdmin.from("notifications").insert({
          recipient_id: task.created_by,
          sender_id: sessionUser.id,
          type: "blocker_flagged",
          title: "Task Blocked",
          message: `Task "${task.title}" has been marked as blocked.`,
          data: { task_id: taskId, priority: updatedTask.priority },
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
            subject: `Task Blocked: ${task.title}`,
            taskTitle: task.title,
            taskId,
            recipientName: creator.data.full_name,
            action: "blocked",
          });
        }
      }

      if (status === "completed") {
        await supabaseAdmin.from("notifications").insert({
          recipient_id: task.created_by,
          sender_id: sessionUser.id,
          type: "task_updated",
          title: "Task Completed",
          message: `Task "${task.title}" has been marked as completed.`,
          data: { task_id: taskId },
          read: false,
        });

        const completedCreator = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", task.created_by)
          .single();

        if (completedCreator.data?.email) {
          await sendTaskEmail({
            to: completedCreator.data.email,
            subject: `Task Completed: ${task.title}`,
            taskTitle: task.title,
            taskId,
            recipientName: completedCreator.data.full_name,
            action: "completed",
          });
        }
      }
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
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

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, title")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(sessionUser.role);
    const isCreator = task.created_by === sessionUser.id;

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

// POST /api/workforce/tasks/[id]/approve
// Manager approves or rejects a completed task
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;
    const body = await request.json();
    const { approved, approval_notes, quality_flag } = body;

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to, status, title, description, priority, due_date, actual_hours, blocker_reason, completion_notes, requires_approval, quality_flag, billable, billable_rate, project_id, sprint_id, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(sessionUser.role);
    const isCreator = task.created_by === sessionUser.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: "Forbidden: only creator or manager can approve" }, { status: 403 });
    }

    if (!task.requires_approval) {
      return NextResponse.json({ error: "This task does not require approval" }, { status: 400 });
    }

    const newStatus = approved ? "approved" : "rejected";
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        status: newStatus,
        approved_by: sessionUser.id,
        approved_at: new Date().toISOString(),
        approval_notes: approval_notes || null,
        quality_flag: quality_flag || null,
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

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from("task_history").insert({
      task_id: taskId,
      actor_id: sessionUser.id,
      action: approved ? "approved" : "rejected",
      old_value: { status: task.status },
      new_value: { status: newStatus, approval_notes, quality_flag },
      notes: approval_notes || `Task ${approved ? 'approved' : 'rejected'}`,
    });

    await supabaseAdmin.from("notifications").insert({
      recipient_id: task.assigned_to,
      sender_id: sessionUser.id,
      type: "task_updated",
      title: approved ? "Task Approved" : "Task Rejected",
      message: `Task "${task.title}" has been ${approved ? 'approved' : 'rejected'}.`,
      data: { task_id: taskId, status: newStatus },
      read: false,
    });

    const assignee = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", task.assigned_to)
      .single();

    if (assignee.data?.email) {
      await sendTaskEmail({
        to: assignee.data.email,
        subject: approved ? `Task Approved: ${task.title}` : `Task Rejected: ${task.title}`,
        taskTitle: task.title,
        taskId,
        recipientName: assignee.data.full_name,
        action: approved ? "approved" : "rejected",
      });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
