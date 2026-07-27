import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

function canWrite(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goal_id");

  let query = supabaseAdmin
    .from("key_results")
    .select("*")
    .order("created_at", { ascending: false });

  if (goalId) {
    query = query.eq("goal_id", goalId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keyResults: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { goal_id, title, description, target_value, unit } = body;

    if (!goal_id || !title || !target_value) {
      return NextResponse.json({ error: "Goal ID, title, and target value are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("key_results")
      .insert({
        goal_id,
        title,
        description: description || null,
        target_value: parseFloat(target_value),
        current_value: 0,
        unit: unit || "number",
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keyResult: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
