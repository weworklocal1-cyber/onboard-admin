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

async function notifyEmployee(employeeId: string, title: string, message: string, senderId: string, data: Record<string, unknown> = {}) {
  await supabaseAdmin.from("notifications").insert({
    recipient_id: employeeId,
    sender_id: senderId,
    type: "schedule_request",
    title,
    message,
    data,
    read: false,
  });
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

    const { data: scheduleRequest, error: fetchError } = await supabaseAdmin
      .from("schedule_requests")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !scheduleRequest) {
      return NextResponse.json({ error: "Schedule request not found" }, { status: 404 });
    }

    if (scheduleRequest.status !== "pending") {
      return NextResponse.json({ error: "Schedule request is already processed" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("schedule_requests")
      .update({
        status,
        reviewed_by: sessionUser.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq("id", params.id)
      .select(`
        *,
        shift:shifts(*),
        employee:profiles!employee_id(id, full_name, department),
        reviewer:profiles!reviewed_by(id, full_name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === "approved") {
      const payload: Record<string, unknown> = {
        employee_id: scheduleRequest.employee_id,
        shift_id: scheduleRequest.shift_id,
        date: scheduleRequest.date,
        is_leave: scheduleRequest.is_leave,
        leave_type: scheduleRequest.is_leave ? scheduleRequest.leave_type : null,
        location: scheduleRequest.shift_id ? scheduleRequest.location : null,
        recurrence_pattern: scheduleRequest.recurrence_pattern,
        parent_assignment_id: null,
      };

      const { error: assignError } = await supabaseAdmin
        .from("roster_assignments")
        .upsert(payload, { onConflict: "employee_id,shift_id,date" });

      if (assignError) {
        return NextResponse.json({ error: assignError.message }, { status: 500 });
      }

      const shiftName = scheduleRequest.shift_id ? "shift" : "leave";
      await notifyEmployee(
        scheduleRequest.employee_id,
        "Schedule Request Approved",
        `Your ${shiftName} request for ${new Date(scheduleRequest.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })} has been approved`,
        sessionUser.id,
        { request_id: scheduleRequest.id, shift_id: scheduleRequest.shift_id, date: scheduleRequest.date }
      );
    } else {
      const shiftName = scheduleRequest.shift_id ? "shift" : "leave";
      await notifyEmployee(
        scheduleRequest.employee_id,
        "Schedule Request Rejected",
        `Your ${shiftName} request for ${new Date(scheduleRequest.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })} has been rejected`,
        sessionUser.id,
        { request_id: scheduleRequest.id, shift_id: scheduleRequest.shift_id, date: scheduleRequest.date, notes }
      );
    }

    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
