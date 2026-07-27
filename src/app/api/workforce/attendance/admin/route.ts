import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
    return profile;
  } catch {
    return null;
  }
}

function isFounderOrAdmin(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    let query = supabaseAdmin
      .from("attendance")
      .select("*")
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const records = data || [];
    const employeeIds = Array.from(new Set(records.map((r: any) => r.employee_id)));

    const employeeMap = new Map<string, { full_name: string; department: string | null }>();
    if (employeeIds.length > 0) {
      const { data: employees } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, department")
        .in("id", employeeIds);

      (employees || []).forEach((e: any) => {
        employeeMap.set(e.id, { full_name: e.full_name, department: e.department });
      });
    }

    const enriched = records.map((r: any) => ({
      ...r,
      employee: employeeMap.get(r.employee_id) || null,
    }));

    return NextResponse.json({ records: enriched, total: count ?? 0, limit, offset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendance" }, { status: 500 });
  }
}
