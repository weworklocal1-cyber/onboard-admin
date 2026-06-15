// @ts-nocheck
// Supabase Edge Function: overdue-tasks
// Runs periodically to flag overdue tasks and notify users.

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
    const nowIso = new Date().toISOString();

    // Find overdue tasks (due_date < now, not completed)
    const { data: overdueTasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, assigned_to, title, due_date, blocker_reason")
      .neq("status", "completed")
      .is("blocker_reason", null)
      .lt("due_date", nowIso);

    if (tasksErr) throw tasksErr;

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ updated: 0, notified: 0 }), {
        headers: { "content-type": "application/json" },
      });
    }

    const taskIds = overdueTasks.map((t: any) => t.id);
    let notified = 0;

    // Insert notifications for assigned users
    for (const task of overdueTasks) {
      const { error: notifErr } = await supabase.from("notifications").insert({
        recipient_id: task.assigned_to,
        sender_id: null,
        type: "task_overdue",
        title: "Overdue Task",
        message: `"${task.title}" is overdue. Please update status or unblock.`,
        data: { task_id: task.id, due_date: task.due_date },
        read: false,
      });
      if (!notifErr) notified++;
    }

    // Update tasks to set status as blocked if they have blocker_reason
    const { error: updateErr } = await supabase
      .from("tasks")
      .update({ blocker_reason: "Overdue - auto-flagged" })
      .in("id", taskIds);

    if (updateErr) {
      console.error("Failed to update task blockers:", updateErr);
    }

    return new Response(JSON.stringify({ updated: taskIds.length, notified }), {
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