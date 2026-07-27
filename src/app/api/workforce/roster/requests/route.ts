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

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("schedule_requests")
    .select(`
      *,
      shift:shifts(*),
      employee:profiles!employee_id(id, full_name, department),
      reviewer:profiles!reviewed_by(id, full_name)
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (!canWrite(sessionUser.role)) {
    query = query.eq("employee_id", sessionUser.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      shift_id,
      date,
      is_leave = false,
      leave_type,
      location = 'office',
      recurrence_pattern,
      start_date,
      end_date,
      notes,
    } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    if (is_leave && !leave_type) {
      return NextResponse.json({ error: "Leave type is required for leave entries" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      employee_id: sessionUser.id,
      shift_id: shift_id || null,
      date,
      is_leave: is_leave || false,
      leave_type: is_leave ? leave_type : null,
      location: shift_id ? location : null,
      recurrence_pattern: recurrence_pattern ? { ...recurrence_pattern, days: recurrence_pattern.days || [] } : null,
      notes: notes || null,
      status: "pending",
    };

    const { data, error } = await supabaseAdmin
      .from("schedule_requests")
      .insert(payload)
      .select(`
        *,
        shift:shifts(*),
        employee:profiles!employee_id(id, full_name, department)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: managers } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ['founder', 'super_admin', 'hr_admin', 'team_lead'])
      .limit(10);

    if (managers && managers.length > 0) {
      const shiftName = shift_id ? "a shift" : "leave";
      for (const manager of managers) {
        await notifyEmployee(
          manager.id,
          "New Schedule Request",
          `${sessionUser.id} requested ${shiftName} on ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}`,
          sessionUser.id,
          { request_id: data.id, shift_id, date }
        );
      }
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
