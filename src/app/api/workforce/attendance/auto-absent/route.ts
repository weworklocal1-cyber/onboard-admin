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

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date } = body;

    const targetDate = date || new Date().toISOString().split("T")[0];

    const { data: rosterAssignments, error: rosterError } = await supabaseAdmin
      .from("roster_assignments")
      .select("employee_id, date")
      .eq("date", targetDate);

    if (rosterError) throw rosterError;

    if (!rosterAssignments || rosterAssignments.length === 0) {
      return NextResponse.json({ message: "No roster assignments found for this date", marked: 0 });
    }

    const employeeIds = Array.from(new Set(rosterAssignments.map((r: any) => r.employee_id)));

    const { data: existingAttendance } = await supabaseAdmin
      .from("attendance")
      .select("employee_id")
      .eq("date", targetDate)
      .in("employee_id", employeeIds);

    const existingIds = new Set((existingAttendance || []).map((a: any) => a.employee_id));

    const absentEmployeeIds = employeeIds.filter((id: string) => !existingIds.has(id));

    if (absentEmployeeIds.length === 0) {
      return NextResponse.json({ message: "All scheduled employees already have attendance records", marked: 0 });
    }

    const recordsToInsert = absentEmployeeIds.map((employee_id: string) => ({
      employee_id,
      date: targetDate,
      status: "absent",
      is_late: false,
      wfh_approved: false,
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("attendance")
      .insert(recordsToInsert)
      .select("*");

    if (insertError) throw insertError;

    return NextResponse.json({
      message: `Marked ${absentEmployeeIds.length} employees as absent`,
      marked: absentEmployeeIds.length,
      records: inserted || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to mark absences" }, { status: 500 });
  }
}
