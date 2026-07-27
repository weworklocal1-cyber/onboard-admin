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

// GET /api/workforce/tasks/calendar
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    let query = supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        department,
        created_by,
        assigned_to,
        creator:profiles!created_by(full_name),
        assignees:task_assignees(
          employee_id,
          status,
          employee:profiles!employee_id(full_name)
        )
      `)
      .gte("due_date", startDateStr)
      .lte("due_date", endDateStr);

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

    const calendarDays: Record<string, any[]> = {};
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendarDays[dateKey] = [];
    }

    (tasks || []).forEach((task: any) => {
      if (task.due_date && calendarDays[task.due_date]) {
        calendarDays[task.due_date].push(task);
      }
    });

    return NextResponse.json({
      calendarDays,
      year: targetYear,
      month: targetMonth,
      daysInMonth,
      startDate: startDateStr,
      endDate: endDateStr,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
