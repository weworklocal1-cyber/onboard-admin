// @ts-nocheck
// Supabase Edge Function: eod-reminder
// Runs at 8:00, 9:00, and 10:00 IST to remind employees who have not submitted EOD updates.
// Inserts into `notifications` table with escalation flags.

import { createClient } from "@supabase/supabase-js";

type DenoEnv = {
  env: { get: (k: string) => string | undefined };
};
declare const Deno: DenoEnv;

function getISTParts(now = new Date()) {
  const fmtDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const fmtTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateParts = fmtDate.formatToParts(now);
  const timeParts = fmtTime.formatToParts(now);
  const get = (parts: any[], type: string) => parts.find((p) => p.type === type)?.value;
  const yyyy = get(dateParts, "year");
  const mm = get(dateParts, "month");
  const dd = get(dateParts, "day");
  const hour = parseInt(get(timeParts, "hour") || "0");
  return {
    yyyyMMdd: `${yyyy}-${mm}-${dd}`,
    hour,
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
    const { yyyyMMdd, hour } = getISTParts(new Date());

    // Determine reminder level based on hour
    let reminderType = "eod_reminder";
    if (hour >= 10) {
      reminderType = "eod_reminder_escalated";
    } else if (hour >= 9) {
      reminderType = "eod_reminder_followup";
    }

    // Find employees who have not submitted daily update today
    const { data: employees, error: employeesErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("status", ["active"])
      .order("id");

    if (employeesErr) throw employeesErr;

    const employeeIds = (employees || []).map((e: any) => e.id);
    if (employeeIds.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, yyyyMMdd, reminderType }), {
        headers: { "content-type": "application/json" },
      });
    }

    // Check for existing daily updates today
    const { data: updateRows, error: updateErr } = await supabase
      .from("daily_updates")
      .select("employee_id")
      .eq("date", yyyyMMdd)
      .in("employee_id", employeeIds);

    if (updateErr) throw updateErr;

    const submitted = new Set((updateRows || []).map((r: any) => r.employee_id));
    const missing = employeeIds.filter((id: string) => !submitted.has(id));

    const notificationRows = missing.slice(0, 500).map((recipientId: string) => ({
      recipient_id: recipientId,
      sender_id: null,
      type: reminderType as any,
      title: hour >= 10 ? "EOD Reminder (Escalated)" : "EOD Update Reminder",
      message: hour >= 10
        ? "End-of-day update overdue! Please submit immediately."
        : "Don't forget to submit your end-of-day update.",
      data: { date: yyyyMMdd, type: "daily_update_reminder" },
      read: false,
    }));

    const { error: insertErr } = await supabase.from("notifications").insert(notificationRows);
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ inserted: notificationRows.length, yyyyMMdd, reminderType }), {
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