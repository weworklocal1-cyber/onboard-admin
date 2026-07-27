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

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employee_ids, rule_ids } = body;

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json({ error: "employee_ids array is required" }, { status: 400 });
    }

    if (!rule_ids || !Array.isArray(rule_ids) || rule_ids.length === 0) {
      return NextResponse.json({ error: "rule_ids array is required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const windowStart14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    let totalFlagsCreated = 0;

    for (const employeeId of employee_ids) {
      const { data: attendance, error: attError } = await supabaseAdmin
        .from("attendance")
        .select("status")
        .eq("employee_id", employeeId)
        .gte("date", windowStart);

      if (attError) continue;

      const attRecords = attendance || [];
      const totalDays = attRecords.length;
      const absentDays = attRecords.filter(a => a.status === 'absent').length;
      const lateDays = attRecords.filter(a => a.status === 'late').length;
      const attendanceRate = totalDays > 0 ? ((totalDays - absentDays) / totalDays) * 100 : 100;

      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from("tasks")
        .select("status, due_date")
        .eq("assigned_to", employeeId)
        .neq("status", "completed");

      if (tasksError) continue;

      const activeTasks = tasks || [];
      const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < today).length;
      const blockedTasks = activeTasks.filter(t => t.status === 'blocked').length;

      const { data: updates, error: updatesError } = await supabaseAdmin
        .from("daily_updates")
        .select("has_blocker")
        .eq("employee_id", employeeId)
        .gte("date", windowStart14);

      if (updatesError) continue;

      const updateRecords = updates || [];
      const missedUpdates = Math.max(0, 14 - updateRecords.length);
      const unresolvedBlockers = updateRecords.filter(u => u.has_blocker).length;

      const { data: rules, error: rulesError } = await supabaseAdmin
        .from("pip_criteria_rules")
        .select("*")
        .in("id", rule_ids)
        .eq("is_active", true);

      if (rulesError || !rules) continue;

      const newFlags = [];
      for (const rule of rules) {
        let currentValue = 0;
        switch (rule.metric_type) {
          case 'attendance_rate': currentValue = Math.round(attendanceRate); break;
          case 'absent_days': currentValue = absentDays; break;
          case 'late_days': currentValue = lateDays; break;
          case 'overdue_tasks': currentValue = overdueTasks; break;
          case 'blocked_tasks': currentValue = blockedTasks; break;
          case 'missed_updates': currentValue = missedUpdates; break;
          case 'unresolved_blockers': currentValue = unresolvedBlockers; break;
          default: continue;
        }

        let isTriggered = false;
        switch (rule.comparison) {
          case 'less_than': isTriggered = currentValue < rule.threshold_value; break;
          case 'greater_than': isTriggered = currentValue > rule.threshold_value; break;
          case 'equals': isTriggered = currentValue === rule.threshold_value; break;
          case 'less_than_or_equal': isTriggered = currentValue <= rule.threshold_value; break;
          case 'greater_than_or_equal': isTriggered = currentValue >= rule.threshold_value; break;
        }

        if (isTriggered) {
          const { data: existing } = await supabaseAdmin
            .from("pip_auto_flags")
            .select("id")
            .eq("employee_id", employeeId)
            .eq("rule_id", rule.id)
            .eq("status", "pending")
            .maybeSingle();

          if (!existing) {
            newFlags.push({
              employee_id: employeeId,
              rule_id: rule.id,
              rule_name: rule.rule_name,
              description: `Metric value ${currentValue}${rule.threshold_unit} breaches threshold ${rule.threshold_value}${rule.threshold_unit}`,
              current_value: currentValue,
              threshold_value: rule.threshold_value,
              threshold_unit: rule.threshold_unit,
              status: 'pending',
            });
          }
        }
      }

      if (newFlags.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("pip_auto_flags")
          .insert(newFlags);

        if (!insertError) {
          totalFlagsCreated += newFlags.length;
        }
      }
    }

    return NextResponse.json({ 
      message: `Processed ${employee_ids.length} employees, created ${totalFlagsCreated} new flags`,
      flagsCreated: totalFlagsCreated 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to run batch criteria check" }, { status: 500 });
  }
}
