import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, department, reporting_manager_id")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employee_id");

  const userIsAdmin = await isAdmin(sessionUser.role);
  let query = supabaseAdmin
    .from("leave_requests")
    .select(`*, employee:profiles!employee_id(full_name, department), approver:profiles!approved_by(full_name)`)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (employeeId) {
    if (userIsAdmin) {
      query = query.eq("employee_id", employeeId);
    } else {
      query = query.eq("employee_id", sessionUser.id);
    }
  } else if (!userIsAdmin) {
    query = query.eq("employee_id", sessionUser.id);
  }

  const { data: leaves, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leaves });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json({ error: "Leave type, start date, and end date are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("leave_requests")
      .insert({
        employee_id: sessionUser.id,
        leave_type,
        start_date,
        end_date,
        reason,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, leave: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}