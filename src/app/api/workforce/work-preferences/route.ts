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

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin.from("employee_work_preferences").select("*");

  if (!canManage(sessionUser.role)) {
    query = query.eq("employee_id", sessionUser.id);
  } else if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      employee_id,
      work_type,
      days_per_week,
      preferred_shift_start,
      preferred_shift_end,
      working_days,
      notes,
    } = body;

    const targetEmployeeId = employee_id || sessionUser.id;
    const isManager = canManage(sessionUser.role);

    if (!isManager && targetEmployeeId !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("employee_work_preferences")
      .upsert(
        {
          employee_id: targetEmployeeId,
          work_type: work_type || "full_time",
          days_per_week: days_per_week ?? 5,
          preferred_shift_start: preferred_shift_start || null,
          preferred_shift_end: preferred_shift_end || null,
          working_days: working_days || [1, 2, 3, 4, 5],
          notes: notes || null,
        },
        { onConflict: "employee_id" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preference: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
