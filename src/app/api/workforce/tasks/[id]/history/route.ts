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

function hasTaskAccess(profile: { id: string; role: string }, task: any): boolean {
  if (!task) return false;
  const isAdmin = ['founder', 'super_admin', 'hr_admin'].includes(profile.role);
  const isLead = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);
  if (isAdmin || isLead) return true;
  return task.created_by === profile.id || task.assigned_to === profile.id;
}

// GET /api/workforce/tasks/[id]/history
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

    if (!hasTaskAccess(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: history, error: historyError } = await supabaseAdmin
      .from("task_history")
      .select(`
        *,
        actor:profiles!actor_id(id, full_name)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ history: history || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST /api/workforce/tasks/[id]/history
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
    const { action, old_value, new_value, notes } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!hasTaskAccess(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: historyEntry, error: historyError } = await supabaseAdmin
      .from("task_history")
      .insert({
        task_id: taskId,
        actor_id: sessionUser.id,
        action,
        old_value: old_value || null,
        new_value: new_value || null,
        notes: notes || null,
      })
      .select(`
        *,
        actor:profiles!actor_id(id, full_name)
      `)
      .single();

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, history: historyEntry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
