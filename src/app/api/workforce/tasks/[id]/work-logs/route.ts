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

function canAccessTask(profile: { id: string; role: string }, task: { created_by: string; assigned_to: string }) {
  if (!task) return false;
  const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);
  if (isAdmin) return true;
  return task.created_by === profile.id || task.assigned_to === profile.id;
}

// POST /api/workforce/tasks/[id]/work-logs
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
    const { hours, log_date, description, is_billable } = body;

    if (!hours || Number(hours) <= 0) {
      return NextResponse.json({ error: "Valid hours are required" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: workLog, error: workLogError } = await supabaseAdmin
      .from("task_work_logs")
      .insert({
        task_id: taskId,
        employee_id: sessionUser.id,
        hours: Number(hours),
        log_date: log_date || new Date().toISOString().split("T")[0],
        description: description || null,
        is_billable: is_billable || false,
      })
      .select(`
        *,
        employee:profiles!employee_id(id, full_name)
      `)
      .single();

    if (workLogError) {
      return NextResponse.json({ error: workLogError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, workLog });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET /api/workforce/tasks/[id]/work-logs
export async function GET(
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
      .select("id, created_by, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: workLogs, error: workLogsError } = await supabaseAdmin
      .from("task_work_logs")
      .select(`
        *,
        employee:profiles!employee_id(id, full_name)
      `)
      .eq("task_id", taskId)
      .order("log_date", { ascending: false });

    if (workLogsError) {
      return NextResponse.json({ error: workLogsError.message }, { status: 500 });
    }

    const totalHours = (workLogs || []).reduce((sum, log) => sum + Number(log.hours), 0);

    return NextResponse.json({ workLogs: workLogs || [], totalHours });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
