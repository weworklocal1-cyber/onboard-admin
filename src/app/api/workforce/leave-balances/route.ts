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
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin
    .from("leave_balances")
    .select("*")
    .order("leave_type", { ascending: true });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  } else {
    query = query.eq("employee_id", sessionUser.id);
  }

  const { data: balances, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ balances: balances || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employee_id, leave_type, total_allocated, used, effective_from, effective_to, notes } = body;

    if (!employee_id || !leave_type || !total_allocated) {
      return NextResponse.json({ error: "employee_id, leave_type, and total_allocated are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("leave_balances")
      .upsert({
        employee_id,
        leave_type,
        total_allocated: parseFloat(total_allocated),
        used: used ? parseFloat(used) : 0,
        effective_from: effective_from || new Date().toISOString().split("T")[0],
        effective_to: effective_to || null,
        notes: notes || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, balance: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
