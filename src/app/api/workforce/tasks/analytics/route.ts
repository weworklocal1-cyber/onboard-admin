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

// GET /api/workforce/tasks/analytics
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    let query = supabaseAdmin
      .from("tasks")
      .select(`
        id,
        status,
        priority,
        due_date,
        estimated_hours,
        actual_hours,
        created_at,
        updated_at,
        department,
        created_by,
        assigned_to,
        creator:profiles!created_by(full_name),
        assignees:task_assignees(employee_id, status)
      `);

    if (department) query = query.eq("department", department);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

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

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === "completed" || t.status === "approved").length || 0;
    const blockedTasks = tasks?.filter(t => t.status === "blocked").length || 0;
    const now = new Date();
    const overdueTasks = tasks?.filter(t => t.due_date && new Date(t.due_date) < now && !["completed", "approved", "rejected"].includes(t.status)).length || 0;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdueRate = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

    const tasksWithHours = tasks?.filter(t => t.actual_hours !== null && t.actual_hours !== undefined) || [];
    const avgCompletionHours = tasksWithHours.length > 0
      ? Math.round((tasksWithHours.reduce((sum, t) => sum + Number(t.actual_hours), 0) / tasksWithHours.length) * 100) / 100
      : null;

    const completedWithDates = tasks?.filter(t => t.status === "completed" || t.status === "approved") || [];
    const cycleTimes = completedWithDates
      .filter(t => t.created_at && t.updated_at)
      .map(t => (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60));
    const avgCycleTimeHours = cycleTimes.length > 0
      ? Math.round((cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length) * 100) / 100
      : null;

    const tasksByPriority: Record<string, number> = {};
    const tasksByStatus: Record<string, number> = {};

    tasks?.forEach(task => {
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
      tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;
    });

    const employeeStats = new Map<string, {
      employee_id: string;
      employee_name: string;
      total: number;
      completed: number;
      blocked: number;
      overdue: number;
      hours: number[];
    }>();

    tasks?.forEach(task => {
      const assignees = (task as any).assignees || [];
      assignees.forEach((assignee: any) => {
        if (!assignee || !assignee.employee_id) return;
        const existing = employeeStats.get(assignee.employee_id) || {
          employee_id: assignee.employee_id,
          employee_name: assignee.employee?.full_name || "Unknown",
          total: 0,
          completed: 0,
          blocked: 0,
          overdue: 0,
          hours: [] as number[],
        };

        existing.total += 1;
        if (assignee.status === "completed") existing.completed += 1;
        if (assignee.status === "blocked") existing.blocked += 1;

        if (task.due_date && new Date(task.due_date) < now && !["completed", "approved", "rejected"].includes(task.status)) {
          existing.overdue += 1;
        }

        if (task.actual_hours !== null && task.actual_hours !== undefined) {
          existing.hours.push(Number(task.actual_hours));
        }

        employeeStats.set(assignee.employee_id, existing);
      });
    });

    const tasksByEmployee = Array.from(employeeStats.values()).map(emp => ({
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      total: emp.total,
      completed: emp.completed,
      blocked: emp.blocked,
      overdue: emp.overdue,
      avg_hours: emp.hours.length > 0 ? Math.round((emp.hours.reduce((a, b) => a + b, 0) / emp.hours.length) * 100) / 100 : null,
    }));

    return NextResponse.json({
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      blocked_tasks: blockedTasks,
      overdue_tasks: overdueTasks,
      completion_rate: completionRate,
      overdue_rate: overdueRate,
      avg_completion_hours: avgCompletionHours,
      avg_cycle_time_hours: avgCycleTimeHours,
      tasks_by_priority: tasksByPriority,
      tasks_by_status: tasksByStatus,
      tasks_by_employee: tasksByEmployee,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
