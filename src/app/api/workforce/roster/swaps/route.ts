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
  const assignmentId = searchParams.get("assignment_id");

  let query = supabaseAdmin
    .from("shift_swap_requests")
    .select(`
      *,
      assignment:roster_assignments(
        id, date,
        shift:shifts(*),
        employee:profiles!employee_id(id, full_name, department)
      ),
      requester:profiles!requested_by(id, full_name, department),
      target:profiles!target_employee_id(id, full_name, department),
      reviewer:profiles!reviewed_by(id, full_name)
    `)
    .order("created_at", { ascending: false });

  if (assignmentId) {
    query = query.eq("assignment_id", assignmentId);
  }

  if (!canWrite(sessionUser.role)) {
    query = query.or(`requested_by.eq.${sessionUser.id},target_employee_id.eq.${sessionUser.id}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ swaps: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assignment_id, target_employee_id, reason } = body;

    if (!assignment_id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    const { data: existingAssignment } = await supabaseAdmin
      .from("roster_assignments")
      .select("employee_id, date")
      .eq("id", assignment_id)
      .single();

    if (!existingAssignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const isAdminUser = canWrite(sessionUser.role);
    const isRequestingOwn = existingAssignment.employee_id === sessionUser.id;

    if (!isAdminUser && !isRequestingOwn) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("shift_swap_requests")
      .insert({
        assignment_id,
        requested_by: sessionUser.id,
        target_employee_id: target_employee_id || null,
        reason: reason || null,
        status: "pending",
      })
      .select(`
        *,
        assignment:roster_assignments(
          id, date,
          shift:shifts(*),
          employee:profiles!employee_id(id, full_name, department)
        ),
        requester:profiles!requested_by(id, full_name, department),
        target:profiles!target_employee_id(id, full_name, department)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ swap: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
