// @ts-nocheck
// Supabase Edge Function: attendance-reminder
// Runs daily at 10:30 AM IST to remind employees who have not checked in.
// Inserts into `notifications` table.

import { createClient } from "@supabase/supabase-js";

// @ts-ignore - Deno runtime
type DenoEnv = {
  env: { get: (k: string) => string | undefined };
};
declare const Deno: DenoEnv;


// Helper: IST (Asia/Kolkata)
function getISTParts(now = new Date()) {
  // Format as YYYY-MM-DD in IST
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  return {
    yyyyMMdd: `${yyyy}-${mm}-${dd}`,
  };
}

// @ts-ignore - Deno runtime
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { yyyyMMdd } = getISTParts(new Date());

    // Employees: those with attendance missing for today.
    // We treat "missing check-in" as: no row OR check_in_time is null.
    // PRD variant: if you need stricter logic (e.g., only status absent), adjust query.

    const { data: employees, error: employeesErr } = await supabase
      .from("profiles")
      .select("id")
      .in("status", ["active"])
      .order("id");

    if (employeesErr) throw employeesErr;

    // Fetch attendance for today for all employees in one query.
    const employeeIds = (employees || []).map((e: any) => e.id);
    if (employeeIds.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, yyyyMMdd }), {
        headers: { "content-type": "application/json" },
      });
    }

    const { data: attendanceRows, error: attendanceErr } = await supabase
      .from("attendance")
      .select("employee_id, check_in_time")
      .eq("date", yyyyMMdd)
      .in("employee_id", employeeIds);

    if (attendanceErr) throw attendanceErr;

    const checkedIn = new Set(
      (attendanceRows || [])
        .filter((r: any) => r.check_in_time)
        .map((r: any) => r.employee_id)
    );

    const missing = employeeIds.filter((id: string) => !checkedIn.has(id));

    // Insert notifications (batched)
    // Avoid duplicates: only insert if no existing unread notification today for this type.
    // For simplicity, we insert blindly; if duplicates are a concern, add a uniqueness constraint.

    const insertBatch = missing.slice(0, 500); // safety cap

    const notificationRows = insertBatch.map((recipientId: string) => ({
      recipient_id: recipientId,
      sender_id: null,
      type: "attendance_reminder",
      title: "Attendance reminder",
      message: "Don't forget to check in for today!",
      data: { date: yyyyMMdd, type: "attendance_reminder" },
      read: false,
    }));

    const { error: insertErr } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ inserted: notificationRows.length, yyyyMMdd }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});

