// @ts-nocheck
// Supabase Edge Function: follow-up-reminder
// Runs every 15 minutes to remind about pending follow-ups.
// Inserts into `notifications` table.

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
  const dateParts = fmtDate.formatToParts(now);
  const get = (parts: any[], type: string) => parts.find((p) => p.type === type)?.value;
  const yyyy = get(dateParts, "year");
  const mm = get(dateParts, "month");
  const dd = get(dateParts, "day");
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
    const today = getISTParts(new Date());

    // Find follow-ups scheduled for today or overdue
    const nowIso = new Date().toISOString();

    const { data: followUps, error: followUpsErr } = await supabase
      .from("follow_ups")
      .select("id, assigned_to, restaurant_id, scheduled_at, follow_up_type, notes, restaurant:restaurants(name)")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at")
      .limit(500);

    if (followUpsErr) throw followUpsErr;

    if (!followUps || followUps.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, today }), {
        headers: { "content-type": "application/json" },
      });
    }

    // Check for existing notifications (avoid duplicates)
    const followUpIds = followUps.map((f: any) => f.id);
    const { data: existingNotes } = await supabase
      .from("notifications")
      .select("recipient_id, data")
      .eq("type", "follow_up_reminder")
      .in("data->follow_up_id", followUpIds);

    const notifiedFollowUpIds = new Set(
      (existingNotes || []).map((n: any) => n.data?.follow_up_id)
    );

    const notificationRows = followUps
      .filter((f: any) => !notifiedFollowUpIds.has(f.id))
      .map((f: any) => ({
        recipient_id: f.assigned_to,
        sender_id: null,
        type: "follow_up_reminder" as any,
        title: "Follow-up Due",
        message: `Follow-up for ${f.restaurant?.name || "restaurant"} is scheduled. Please complete: ${f.follow_up_type}.`,
        data: { follow_up_id: f.id, scheduled_at: f.scheduled_at },
        read: false,
      }));

    const { error: insertErr } = await supabase.from("notifications").insert(notificationRows);
    if (insertErr) throw insertErr;

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