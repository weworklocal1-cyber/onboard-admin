import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isLeadOrAbove } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, department")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, assignees, priority, due_date, estimated_hours, department, tags, attachment_urls } = body;

    if (!title || !assignees || !Array.isArray(assignees) || assignees.length === 0) {
      return NextResponse.json({ error: "Title and at least one assignee are required" }, { status: 400 });
    }

    // Check permission: only lead+ can create tasks
    const leadOrAbove = await isLeadOrAbove(sessionUser.role);
    if (!leadOrAbove) {
      return NextResponse.json({ error: "Forbidden: only leads and above can create tasks" }, { status: 403 });
    }

    // Create the main task
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "medium",
        due_date: due_date || null,
        estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null,
        department: department || sessionUser.department || "operations",
        tags: tags || [],
        attachment_urls: attachment_urls || [],
        created_by: sessionUser.id,
      })
      .select(`
        *,
        creator:profiles!created_by(id, full_name)
      `)
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Create task assignees
    const assigneeIds = Array.isArray(assignees) ? assignees : [assignees];
    const assigneePromises = assigneeIds.map((assigneeId: string) =>
      supabaseAdmin.from("task_assignees").insert({
        task_id: task.id,
        employee_id: assigneeId,
        status: "pending",
      })
    );

    const assigneeResults = await Promise.all(assigneePromises);
    const failedAssignees = assigneeResults.filter(r => r.error);

    if (failedAssignees.length > 0) {
      console.error("Failed to assign some employees:", failedAssignees);
    }

    // Create notifications for all assignees
    const notificationPromises = assigneeIds.map((assigneeId: string) =>
      supabaseAdmin.from("notifications").insert({
        recipient_id: assigneeId,
        sender_id: sessionUser.id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `${sessionUser.full_name} assigned you a task: "${title}"`,
        data: { task_id: task.id, priority: task.priority, due_date: task.due_date },
        read: false,
      })
    );

    await Promise.all(notificationPromises);

    // Send Teams notification
    const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (teamsWebhookUrl && assigneeIds.length > 0) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teams-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          title: "📋 New Task Assigned",
          message: `**${sessionUser.full_name}** assigned a new task to ${assigneeIds.length} employee(s).`,
          type: "task_assigned",
          data: {
            task_title: title,
            priority: task.priority,
            due_date: task.due_date,
            department: task.department,
            assignee_count: assigneeIds.length,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/workforce/tasks`,
          },
          recipient_id: assigneeIds[0],
        }),
      }).catch((err) => console.error("Teams notification failed:", err));
    }

    // Fetch the complete task with assignees
    const { data: completeTask } = await supabaseAdmin
      .from("tasks")
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
      .eq("id", task.id)
      .single();

    return NextResponse.json({ success: true, task: completeTask });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
