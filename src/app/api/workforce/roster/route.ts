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

function isRecurrenceDay(pattern: { frequency: string; days: number[] } | null, dateStr: string) {
  if (!pattern || !pattern.days || pattern.days.length === 0) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const mapped = dayOfWeek === 0 ? 7 : dayOfWeek;
  if (!pattern.days.includes(mapped)) return false;
  if (pattern.frequency === 'biweekly') {
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const weekNumber = Math.floor((d.getTime() - startOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weekNumber % 2 === 0;
  }
  return true;
}

function getDatesInRange(start: string, end: string, days: number[], frequency: 'weekly' | 'biweekly' | null) {
  const dates: string[] = [];
  const cursor = new Date(start + 'T00:00:00');
  const limit = new Date(end + 'T00:00:00');
  while (cursor <= limit) {
    const dayOfWeek = cursor.getDay();
    const mapped = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (days.includes(mapped)) {
      if (!frequency || frequency === 'weekly') {
        const year = cursor.getFullYear();
        const month = String(cursor.getMonth() + 1).padStart(2, '0');
        const day = String(cursor.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      } else if (frequency === 'biweekly') {
        const startOfWeek = new Date(cursor);
        startOfWeek.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
        const weekNumber = Math.floor((cursor.getTime() - startOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekNumber % 2 === 0) {
          const year = cursor.getFullYear();
          const month = String(cursor.getMonth() + 1).padStart(2, '0');
          const day = String(cursor.getDate()).padStart(2, '0');
          dates.push(`${year}-${month}-${day}`);
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function notifyEmployee(employeeId: string, title: string, message: string, senderId: string, data: Record<string, unknown> = {}) {
  await supabaseAdmin.from("notifications").insert({
    recipient_id: employeeId,
    sender_id: senderId,
    type: "schedule_assigned",
    title,
    message,
    data,
    read: false,
  });
}

// GET /api/workforce/roster
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");
  const employee_id = searchParams.get("employee_id");
  const include_recurring = searchParams.get("include_recurring") === 'true';

  let query = supabaseAdmin
    .from("roster_assignments")
    .select(`
      *, 
      shift:shifts(*), 
      employee:profiles!employee_id(id, full_name, department)
    `)
    .order("date", { ascending: true });

  if (date) {
    query = query.eq("date", date);
  } else if (start_date && end_date) {
    query = query.gte("date", start_date).lte("date", end_date);
  }

  if (employee_id) {
    query = query.eq("employee_id", employee_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let assignments = data || [];

  if (include_recurring && start_date && end_date) {
    const recurringParents = assignments.filter(a => a.recurrence_pattern && !a.parent_assignment_id);
    const expanded: any[] = [];
    for (const parent of recurringParents) {
      const pattern = parent.recurrence_pattern as { frequency: 'weekly' | 'biweekly'; days: number[] } | null;
      if (!pattern) continue;
      const dates = getDatesInRange(start_date, end_date, pattern.days, pattern.frequency);
      for (const dateStr of dates) {
        expanded.push({
          ...parent,
          id: `${parent.id}_${dateStr}`,
          date: dateStr,
          parent_assignment_id: parent.id,
          is_recurring_instance: true,
        });
      }
    }
    assignments = [...assignments, ...expanded];
  }

  return NextResponse.json({ assignments });
}

// POST /api/workforce/roster
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || !canWrite(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      employee_id,
      shift_id,
      date,
      is_leave = false,
      leave_type,
      location = 'office',
      recurrence_pattern,
      expand_recurring = false,
    } = body;

    if (!employee_id || !date) {
      return NextResponse.json({ error: "Employee and date are required" }, { status: 400 });
    }

    if (is_leave && !leave_type) {
      return NextResponse.json({ error: "Leave type is required for leave entries" }, { status: 400 });
    }

    const start_date = body.start_date || date;
    const end_date = body.end_date || date;

    const dates = recurrence_pattern?.days && recurrence_pattern.days.length > 0
      ? getDatesInRange(start_date, end_date, recurrence_pattern.days, recurrence_pattern.frequency || 'weekly')
      : [date];

    const results: any[] = [];
    const conflicts: string[] = [];

    for (const dateStr of dates) {
      const { data: existing } = await supabaseAdmin
        .from("roster_assignments")
        .select("id, is_leave, shift_id")
        .eq("employee_id", employee_id)
        .eq("date", dateStr)
        .neq("id", body.parent_id || '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

      if (existing && !existing.is_leave) {
        const { data: shift } = await supabaseAdmin.from("shifts").select("name").eq("id", existing.shift_id).maybeSingle();
        conflicts.push(`${dateStr}: ${shift?.name || 'Existing shift'}`);
        continue;
      }

      const payload: Record<string, unknown> = {
        employee_id,
        shift_id: shift_id || null,
        date: dateStr,
      };

      if (is_leave) {
        payload.is_leave = true;
        payload.leave_type = leave_type || null;
      } else {
        payload.shift_id = shift_id || null;
        payload.location = location || null;
      }

      if (recurrence_pattern?.days?.length > 0) {
        payload.recurrence_pattern = { ...recurrence_pattern, days: recurrence_pattern.days || [] };
      }

      if (body.parent_id) {
        payload.parent_assignment_id = body.parent_id;
      }

      const { data, error } = await supabaseAdmin
        .from("roster_assignments")
        .upsert(payload, { onConflict: "employee_id,shift_id,date" })
        .select(`
          *, 
          shift:shifts(*), 
          employee:profiles!employee_id(id, full_name, department)
        `)
        .single();

      if (error) {
        return NextResponse.json({ error: `Database error: ${error.message}. Make sure migrations 20260725_corporate_scheduling.sql and 20260727_schedule_requests.sql are applied.` }, { status: 500 });
      }

      results.push(data);

      if (shift_id && !is_leave) {
        try {
          const { data: shift } = await supabaseAdmin.from("shifts").select("name, start_time, end_time").eq("id", shift_id).single();
          await notifyEmployee(
            employee_id,
            "Schedule Assigned",
            `You have been assigned to ${shift?.name || 'a shift'} on ${new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}`,
            sessionUser.id,
            { assignment_id: data.id, shift_id, date: dateStr }
          );
        } catch {
          // Notification failure should not block assignment creation
        }
      }
    }

    return NextResponse.json({
      assignments: results,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      expanded: expand_recurring && recurrence_pattern ? dates.length > 1 : false,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

// DELETE /api/workforce/roster
export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || !canWrite(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, delete_recurring_series = false } = body;

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    if (delete_recurring_series) {
      const { data: parent } = await supabaseAdmin
        .from("roster_assignments")
        .select("employee_id, shift_id, date")
        .eq("id", id)
        .single();

      const { data: parentShift } = parent?.shift_id
        ? await supabaseAdmin.from("shifts").select("name").eq("id", parent.shift_id).maybeSingle()
        : { data: null };

      const { error } = await supabaseAdmin
        .from("roster_assignments")
        .delete()
        .or(`id.eq.${id},parent_assignment_id.eq.${id}`);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (parent) {
        await notifyEmployee(
          parent.employee_id,
          "Schedule Removed",
          `Your recurring schedule (${parentShift?.name || 'shift'}) has been removed`,
          sessionUser.id,
          { assignment_id: id }
        );
      }

      return NextResponse.json({ success: true });
    }

    const { data: assignment } = await supabaseAdmin
      .from("roster_assignments")
      .select("employee_id, shift_id, date")
      .eq("id", id)
      .single();

    const { data: shiftData } = assignment?.shift_id
      ? await supabaseAdmin.from("shifts").select("name").eq("id", assignment.shift_id).maybeSingle()
      : { data: null };

    const { error } = await supabaseAdmin
      .from("roster_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (assignment) {
      await notifyEmployee(
        assignment.employee_id,
        "Schedule Removed",
        `Your schedule for ${new Date(assignment.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} (${shiftData?.name || 'shift'}) has been removed`,
        sessionUser.id,
        { assignment_id: id }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
