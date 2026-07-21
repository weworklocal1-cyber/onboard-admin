// @ts-nocheck
// Supabase Edge Function: checkout-reminder
// Runs daily at 7:30 PM IST to remind employees who have not checked out.
// Inserts into `notifications` table.

import { createClient } from "@supabase/supabase-js";

// @ts-ignore - Deno runtime
type DenoEnv = {
  env: { get: (k: string) => string | undefined };
};
declare const Deno: DenoEnv;


type Json = unknown;

type AttendanceRow = { employee_id: string };

type ProfileRow = { id: string };

function getISTYMD(now = new Date()) {
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
  return `${yyyy}-${mm}-${dd}`;
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
    const today = getISTYMD(new Date());

    // Find active employees who have checked in today but not checked out.
    const { data: employees, error: employeesErr } = await supabase
      .from("profiles")
      .select("id")
      .in("status", ["active"])
      .order("id");

    if (employeesErr) throw employeesErr;

    const employeeIds = (employees || []).map((e: any) => e.id);
    if (employeeIds.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, today }), {
        headers: { "content-type": "application/json" },
      });
    }

    const { data: attendanceRows, error: attendanceErr } = await supabase
      .from("attendance")
      .select("employee_id")
      .eq("date", today)
      .in("employee_id", employeeIds)
      .not("check_in_time", "is", null)
      .is("check_out_time", null);

    if (attendanceErr) throw attendanceErr;

    const remaining = new Set((attendanceRows || []).map((r: any) => r.employee_id));
    const remainingIds = Array.from(remaining);

    const insertBatch = remainingIds.slice(0, 500);

    const notificationRows = insertBatch.map((recipientId: string) => ({
      recipient_id: recipientId,
      sender_id: null,
      type: "checkout_reminder",
      title: "Checkout reminder",
      message: "Please check out to log your working hours.",
      data: { date: today, type: "checkout_reminder" },
      read: false,
    }));

    const { error: insertErr } = await supabase.from("notifications").insert(notificationRows);
    if (insertErr) throw insertErr;

    // Send Teams notification
    const teamsWebhookUrl = Deno.env.get("TEAMS_WEBHOOK_URL");
    if (teamsWebhookUrl) {
      const card = {
        "@type": "MessageCard" as const,
        "@context": "http://schema.org/extensions" as const,
        themeColor: "FFA500",
        title: "⏰ Checkout Reminder",
        text: `You have **${remainingIds.length}** employee(s) checked in but not checked out today.`,
        sections: [
          {
            text: `Please remind them to check out to log their working hours.`,
          },
        ],
      };

      await fetch(teamsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      }).catch(err => console.error("Teams notification failed:", err));
    }

    return new Response(JSON.stringify({ inserted: notificationRows.length, today }), {
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

