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

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

function getWorkingDates(startDate: Date, endDate: Date, workingDays: number[]): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (workingDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employee_id, start_date, end_date } = body;

    if (!start_date || !end_date) {
      return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start > end) {
      return NextResponse.json({ error: "start_date must be before end_date" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start > today) {
      return NextResponse.json({ error: "Cannot generate attendance for future dates" }, { status: 400 });
    }

    let employeesQuery = supabaseAdmin
      .from("profiles")
      .select("id, employment_type")
      .eq("status", "active");

    if (employee_id) {
      employeesQuery = employeesQuery.eq("id", employee_id);
    }

    const { data: employees, error: empError } = await employeesQuery;
    if (empError) throw empError;
    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: "No employees found" }, { status: 404 });
    }

    const employeeIds = employees.map((e) => e.id);
    const { data: preferences } = await supabaseAdmin
      .from("employee_work_preferences")
      .select("employee_id, working_days")
      .in("employee_id", employeeIds);

    const prefsMap = new Map<string, number[]>();
    (preferences || []).forEach((p: any) => {
      if (p.working_days && Array.isArray(p.working_days) && p.working_days.length > 0) {
        prefsMap.set(p.employee_id, p.working_days);
      }
    });

    const existingQuery = supabaseAdmin
      .from("attendance")
      .select("employee_id, date")
      .gte("date", start_date)
      .lte("date", end_date)
      .in("employee_id", employeeIds);

    const { data: existing } = await existingQuery;
    const existingSet = new Set((existing || []).map((r: any) => `${r.employee_id}_${r.date}`));

    const recordsToInsert: any[] = [];
    for (const emp of employees) {
      const workingDays = prefsMap.get(emp.id) || [1, 2, 3, 4, 5];
      const workingDates = getWorkingDates(start, end, workingDays);
      for (const date of workingDates) {
        const dateStr = date.toISOString().split("T")[0];
        const key = `${emp.id}_${dateStr}`;
        if (!existingSet.has(key)) {
          recordsToInsert.push({
            employee_id: emp.id,
            date: dateStr,
            status: "present",
            is_late: false,
            wfh_approved: false,
          });
        }
      }
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json({ message: "No new attendance records to create", created: 0 });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("attendance")
      .insert(recordsToInsert)
      .select("*");

    if (insertError) throw insertError;

    return NextResponse.json({ message: `Created ${recordsToInsert.length} attendance records`, created: recordsToInsert.length, records: inserted || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate attendance" }, { status: 500 });
  }
}
