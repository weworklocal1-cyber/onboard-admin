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
  const employeeId = searchParams.get("employee_id");
  const quarter = searchParams.get("quarter");
  const year = searchParams.get("year");

  let query = supabaseAdmin
    .from("goals")
    .select(`
      *,
      employee:profiles!employee_id(id, full_name, department),
      parent_goal:goals!parent_goal_id(id, title)
    `)
    .order("created_at", { ascending: false });

  if (employeeId) {
    if (!canWrite(sessionUser.role) && employeeId !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    query = query.eq("employee_id", employeeId);
  } else if (!canWrite(sessionUser.role)) {
    query = query.eq("employee_id", sessionUser.id);
  }

  if (quarter) query = query.eq("quarter", quarter);
  if (year) query = query.eq("year", parseInt(year));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goals: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { employee_id, title, description, quarter, year, target_value, unit, alignment, parent_goal_id } = body;

    if (!title || !quarter || !year) {
      return NextResponse.json({ error: "Title, quarter, and year are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .insert({
        employee_id: employee_id || sessionUser.id,
        title,
        description: description || null,
        quarter,
        year: parseInt(year),
        target_value: parseFloat(target_value) || 0,
        unit: unit || "number",
        alignment: alignment || "individual",
        parent_goal_id: parent_goal_id || null,
        status: "active",
      })
      .select(`
        *,
        employee:profiles!employee_id(id, full_name, department)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goal: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
