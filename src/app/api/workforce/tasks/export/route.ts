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
    .select("id, full_name, role, department")
    .eq("id", user.id)
    .single();

  return profile;
}

function isManager(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

// GET /api/workforce/tasks/export
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const department = searchParams.get("department");
    const assigned_to = searchParams.get("assigned_to");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    let query = supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        estimated_hours,
        actual_hours,
        created_at,
        department,
        creator:profiles!created_by(full_name),
        assignees:task_assignees(
          employee_id,
          status,
          employee:profiles!employee_id(full_name)
        )
      `);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (department) query = query.eq("department", department);
    if (date_from) query = query.gte("created_at", date_from);
    if (date_to) query = query.lte("created_at", date_to);

    if (!isManager(sessionUser.role)) {
      const { data: myAssignments } = await supabaseAdmin
        .from("task_assignees")
        .select("task_id")
        .eq("employee_id", sessionUser.id);

      const myTaskIds = myAssignments?.map(a => a.task_id) || [];
      query = query.in("id", myTaskIds);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filteredTasks = tasks || [];

    if (assigned_to && filteredTasks.length > 0) {
      filteredTasks.forEach((task: any) => {
        task.assignees = task.assignees?.filter((a: any) => a.employee_id === assigned_to) || [];
      });
    }

    if (format === "csv") {
      const headers = [
        "Task ID",
        "Title",
        "Description",
        "Status",
        "Priority",
        "Due Date",
        "Estimated Hours",
        "Actual Hours",
        "Created At",
        "Department",
        "Creator",
        "Assignees",
        "Assignee Status",
      ];

      const rows = filteredTasks.map((task: any) => {
        const assignees = (task.assignees || [])
          .map((a: any) => a.employee?.full_name || "Unknown")
          .join("; ");
        const assigneeStatuses = (task.assignees || [])
          .map((a: any) => a.status)
          .join("; ");

        return [
          task.id,
          `"${(task.title || "").replace(/"/g, '""')}"`,
          `"${(task.description || "").replace(/"/g, '""')}"`,
          task.status,
          task.priority,
          task.due_date || "",
          task.estimated_hours || "",
          task.actual_hours || "",
          task.created_at ? new Date(task.created_at).toISOString().split("T")[0] : "",
          task.department || "",
          task.creator?.full_name || "",
          assignees,
          assigneeStatuses,
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `tasks-export-${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      tasks: filteredTasks,
      count: filteredTasks.length,
      exported_at: new Date().toISOString(),
      format,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
