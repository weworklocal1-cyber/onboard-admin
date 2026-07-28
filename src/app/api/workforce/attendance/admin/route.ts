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

    let employeesQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, department, status, employment_type")
      .eq("status", "active")
      .order("full_name", { ascending: true });

    if (employeeId) {
      employeesQuery = employeesQuery.eq("id", employeeId);
    }

    const { data: employees, error: empError } = await employeesQuery;
    if (empError) throw empError;

    const employeeIds = (employees || []).map((e: any) => e.id);

    let attendanceQuery = supabaseAdmin
      .from("attendance")
      .select("*")
      .in("employee_id", employeeIds.length > 0 ? employeeIds : ["00000000-0000-0000-0000-000000000000"])
      .order("date", { ascending: false });

    if (startDate) {
      attendanceQuery = attendanceQuery.gte("date", startDate);
    }

    if (endDate) {
      attendanceQuery = attendanceQuery.lte("date", endDate);
    }

    const { data: attendanceRecords, error: attError } = await attendanceQuery;
    if (attError) throw attError;

    const attendanceMap = new Map<string, any[]>();
    (attendanceRecords || []).forEach((record: any) => {
      if (!attendanceMap.has(record.employee_id)) {
        attendanceMap.set(record.employee_id, []);
      }
      attendanceMap.get(record.employee_id)!.push(record);
    });

    const enriched = (employees || []).map((emp: any) => {
      const records = attendanceMap.get(emp.id) || [];
      return {
        ...emp,
        attendance_records: records,
        has_attendance: records.length > 0,
      };
    });

    const total = enriched.length;
    const paginated = enriched.slice(offset, offset + limit);

    return NextResponse.json({ 
      records: paginated, 
      total, 
      limit, 
      offset,
      date_range: startDate && endDate ? { start: startDate, end: endDate } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendance" }, { status: 500 });
  }
}
