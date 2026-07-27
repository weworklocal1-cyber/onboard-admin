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
  return ['founder', 'super_admin', 'hr_admin'].includes(role);
}

function getStartOfWindow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employee_id, rule_ids } = body;

    if (!employee_id || !rule_ids || !Array.isArray(rule_ids) || rule_ids.length === 0) {
      return NextResponse.json({ error: "employee_id and rule_ids array are required" }, { status: 400 });
    }

    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("pip_criteria_rules")
      .select("*")
      .in("id", rule_ids)
      .eq("is_active", true);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return NextResponse.json({ error: "No active rules found" }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    const windowStart = getStartOfWindow(30);
    const windowStart14 = getStartOfWindow(14);
    const windowStart7 = getStartOfWindow(7);

    const { data: attendance, error: attError } = await supabaseAdmin
      .from("attendance")
      .select("status, date")
      .eq("employee_id", employee_id)
      .gte("date", windowStart);

    if (attError) throw attError;

    const attRecords = attendance || [];
    const totalDays = attRecords.length;
    const absentDays = attRecords.filter(a => a.status === 'absent').length;
    const lateDays = attRecords.filter(a => a.status === 'late').length;
    const attendanceRate = totalDays > 0 ? ((totalDays - absentDays) / totalDays) * 100 : 100;

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("status, due_date")
      .eq("assigned_to", employee_id)
      .neq("status", "completed");

    if (tasksError) throw tasksError;

    const activeTasks = tasks || [];
    const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < today).length;
    const blockedTasks = activeTasks.filter(t => t.status === 'blocked').length;
    const taskCompletionRate = 0;

    const { data: updates, error: updatesError } = await supabaseAdmin
      .from("daily_updates")
      .select("date, blockers, has_blocker")
      .eq("employee_id", employee_id)
      .gte("date", windowStart14);

    if (updatesError) throw updatesError;

    const updateRecords = updates || [];
    const missedUpdates = Math.max(0, 14 - updateRecords.length);
    const unresolvedBlockers = updateRecords.filter(u => u.has_blocker && !u.blockers).length;

    const flags = [];
    for (const rule of rules) {
      let currentValue = 0;
      let description = "";

      switch (rule.metric_type) {
        case 'attendance_rate':
          currentValue = Math.round(attendanceRate);
          description = `Attendance rate is ${currentValue}% in the last ${rule.window_days} days (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        case 'absent_days':
          currentValue = absentDays;
          description = `${absentDays} absent days in the last ${rule.window_days} days (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        case 'late_days':
          currentValue = lateDays;
          description = `${lateDays} late arrivals in the last ${rule.window_days} days (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        case 'overdue_tasks':
          currentValue = overdueTasks;
          description = `${overdueTasks} overdue tasks currently (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        case 'blocked_tasks':
          currentValue = blockedTasks;
          description = `${blockedTasks} blocked tasks currently (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        case 'missed_updates':
          currentValue = missedUpdates;
          description = `${missedUpdates} missed daily updates in the last ${rule.window_days} days (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        case 'unresolved_blockers':
          currentValue = unresolvedBlockers;
          description = `${unresolvedBlockers} unresolved blockers in the last ${rule.window_days} days (threshold: ${rule.threshold_value}${rule.threshold_unit})`;
          break;
        default:
          continue;
      }

      let isTriggered = false;
      switch (rule.comparison) {
        case 'less_than':
          isTriggered = currentValue < rule.threshold_value;
          break;
        case 'greater_than':
          isTriggered = currentValue > rule.threshold_value;
          break;
        case 'equals':
          isTriggered = currentValue === rule.threshold_value;
          break;
        case 'less_than_or_equal':
          isTriggered = currentValue <= rule.threshold_value;
          break;
        case 'greater_than_or_equal':
          isTriggered = currentValue >= rule.threshold_value;
          break;
        default:
          isTriggered = false;
      }

      if (isTriggered) {
        const { data: existing } = await supabaseAdmin
          .from("pip_auto_flags")
          .select("id")
          .eq("employee_id", employee_id)
          .eq("rule_id", rule.id)
          .eq("status", "pending")
          .maybeSingle();

        if (!existing) {
          flags.push({
            employee_id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            description,
            current_value: currentValue,
            threshold_value: rule.threshold_value,
            threshold_unit: rule.threshold_unit,
            status: 'pending',
          });
        }
      }
    }

    if (flags.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("pip_auto_flags")
        .insert(flags);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ 
      message: `Processed ${rules.length} rules, created ${flags.length} new flags`,
      flagsCreated: flags.length 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to run criteria engine" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("pip_auto_flags")
      .select(`
        *,
        employee:profiles!employee_id(id, full_name, department)
      `)
      .order("created_at", { ascending: false });

    if (employeeId) query = query.eq("employee_id", employeeId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ flags: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch flags" }, { status: 500 });
  }
}
