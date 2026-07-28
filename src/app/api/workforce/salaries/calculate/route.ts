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

const ADMIN_ROLES = ["founder", "super_admin", "hr_admin"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getWeekday(year: number, month: number, day: number): number {
  const d = new Date(year, month, day);
  return d.getDay();
}

function getWorkingDaysInMonth(year: number, month: number, workingDays: number[]): number[] {
  const days: number[] = [];
  const totalDays = getDaysInMonth(year, month);
  for (let day = 1; day <= totalDays; day++) {
    const weekday = getWeekday(year, month, day);
    const mapped = weekday === 0 ? 7 : weekday;
    if (workingDays.includes(mapped)) {
      days.push(day);
    }
  }
  return days;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employee_id, month, year } = body;

    if (!employee_id || !month || !year) {
      return NextResponse.json({ error: "employee_id, month, and year are required" }, { status: 400 });
    }

    const isAdmin = ADMIN_ROLES.includes(sessionUser.role);
    if (!isAdmin && employee_id !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: "Invalid month/year" }, { status: 400 });
    }

    const { data: salaryData, error: salaryError } = await supabaseAdmin
      .from("salaries")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("status", "active")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (salaryError) throw salaryError;

    if (!salaryData) {
      return NextResponse.json({ error: "No active salary record found for this employee" }, { status: 404 });
    }

    const { data: prefsData } = await supabaseAdmin
      .from("employee_work_preferences")
      .select("working_days")
      .eq("employee_id", employee_id)
      .maybeSingle();

    const workingDays = (prefsData?.working_days as number[] | undefined)?.length ? prefsData!.working_days : [1, 2, 3, 4, 5];

    const workingDayNumbers = getWorkingDaysInMonth(yearNum, monthNum, workingDays);
    const totalWorkingDays = workingDayNumbers.length;

    const monthStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
    const { data: attendanceData, error: attError } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("employee_id", employee_id)
      .gte("date", `${monthStr}-01`)
      .lte("date", `${monthStr}-${String(getDaysInMonth(yearNum, monthNum)).padStart(2, '0')}`);

    if (attError) throw attError;

    const attendanceMap = new Map<string, any>();
    (attendanceData || []).forEach((a: any) => {
      attendanceMap.set(a.date, a);
    });

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let wfhDays = 0;
    let leaveDays = 0;
    const dailyWage = totalWorkingDays > 0 ? Number(salaryData.gross_salary) / totalWorkingDays : 0;

    const attendanceBreakdown: Array<{
      date: string;
      status: string;
      deduction: number;
      note: string;
    }> = [];

    for (const day of workingDayNumbers) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      const record = attendanceMap.get(dateStr);
      const status = record?.status || "absent";
      let deduction = 0;
      let note = "";

      switch (status) {
        case "present":
          presentDays++;
          note = "Full day present";
          break;
        case "late":
          presentDays++;
          lateDays++;
          deduction = dailyWage * 0.1;
          note = `Late arrival - 10% deduction (₹${deduction.toFixed(2)})`;
          break;
        case "half_day":
          presentDays++;
          halfDays++;
          deduction = dailyWage * 0.5;
          note = `Half day - 50% deduction (₹${deduction.toFixed(2)})`;
          break;
        case "wfh":
          wfhDays++;
          note = "Work from home";
          break;
        case "on_leave":
          leaveDays++;
          note = "On approved leave";
          break;
        case "absent":
        default:
          absentDays++;
          deduction = dailyWage;
          note = `Absent - full day deduction (₹${deduction.toFixed(2)})`;
          break;
      }

      if (deduction > 0) {
        attendanceBreakdown.push({ date: dateStr, status, deduction: Math.round(deduction * 100) / 100, note });
      }
    }

    const totalDeduction = attendanceBreakdown.reduce((sum, item) => sum + item.deduction, 0);
    const fixedDeductions = Number(salaryData.pf_employee || 0) + Number(salaryData.professional_tax || 0) + Number(salaryData.tds || 0) + Number(salaryData.other_deductions || 0);
    const grossSalary = Number(salaryData.gross_salary);
    const netSalary = Math.max(0, grossSalary - fixedDeductions - totalDeduction);

    return NextResponse.json({
      employee_id,
      employee: salaryData.employee,
      month: monthStr,
      gross_salary: grossSalary,
      base_salary: Number(salaryData.base_salary || 0),
      allowances: {
        hra: Number(salaryData.hra || 0),
        special_allowance: Number(salaryData.special_allowance || 0),
        performance_bonus: Number(salaryData.performance_bonus || 0),
        travel_allowance: Number(salaryData.travel_allowance || 0),
        medical_allowance: Number(salaryData.medical_allowance || 0),
        other_allowances: Number(salaryData.other_allowances || 0),
      },
      fixed_deductions: {
        pf_employee: Number(salaryData.pf_employee || 0),
        pf_employer: Number(salaryData.pf_employer || 0),
        professional_tax: Number(salaryData.professional_tax || 0),
        tds: Number(salaryData.tds || 0),
        other_deductions: Number(salaryData.other_deductions || 0),
        total: fixedDeductions,
      },
      attendance_summary: {
        total_working_days: totalWorkingDays,
        present: presentDays,
        absent: absentDays,
        late: lateDays,
        half_day: halfDays,
        wfh: wfhDays,
        on_leave: leaveDays,
        daily_wage: Math.round(dailyWage * 100) / 100,
      },
      attendance_deductions: {
        total: Math.round(totalDeduction * 100) / 100,
        breakdown: attendanceBreakdown,
      },
      net_salary: Math.round(netSalary * 100) / 100,
      payment_frequency: salaryData.payment_frequency,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate salary deductions" }, { status: 500 });
  }
}
