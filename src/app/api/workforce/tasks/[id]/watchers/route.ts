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

// POST /api/workforce/tasks/[id]/watchers
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
    const { employee_id } = body;

    if (!employee_id) {
      return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
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

    const { data: watcher, error: watcherError } = await supabaseAdmin
      .from("task_watchers")
      .insert({
        task_id: taskId,
        employee_id,
      })
      .select(`
        *,
        employee:profiles!employee_id(id, full_name, profile_picture_url)
      `)
      .single();

    if (watcherError) {
      if (watcherError.code === "23505") {
        return NextResponse.json({ error: "Already watching this task" }, { status: 409 });
      }
      return NextResponse.json({ error: watcherError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, watcher });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET /api/workforce/tasks/[id]/watchers
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

    const { data: watchers, error: watchersError } = await supabaseAdmin
      .from("task_watchers")
      .select(`
        *,
        employee:profiles!employee_id(id, full_name, profile_picture_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (watchersError) {
      return NextResponse.json({ error: watchersError.message }, { status: 500 });
    }

    return NextResponse.json({ watchers: watchers || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/workforce/tasks/[id]/watchers
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
    const body = await request.json();
    const { employee_id } = body;

    if (!employee_id) {
      return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
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

    const { error: deleteError } = await supabaseAdmin
      .from("task_watchers")
      .delete()
      .eq("task_id", taskId)
      .eq("employee_id", employee_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
