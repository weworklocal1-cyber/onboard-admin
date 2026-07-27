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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status, notes } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: swapRequest } = await supabaseAdmin
      .from("shift_swap_requests")
      .select("id, assignment_id, target_employee_id, status")
      .eq("id", params.id)
      .single();

    if (!swapRequest) {
      return NextResponse.json({ error: "Swap request not found" }, { status: 404 });
    }

    if (swapRequest.status !== "pending") {
      return NextResponse.json({ error: "Swap request is already processed" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("shift_swap_requests")
      .update({
        status,
        reviewed_by: sessionUser.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq("id", params.id)
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
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === "approved" && swapRequest.target_employee_id) {
      await supabaseAdmin
        .from("roster_assignments")
        .update({ employee_id: swapRequest.target_employee_id })
        .eq("id", swapRequest.assignment_id);
    }

    return NextResponse.json({ swap: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
