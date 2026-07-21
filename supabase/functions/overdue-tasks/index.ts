// @ts-nocheck
// Supabase Edge Function: overdue-tasks
// Runs periodically to flag overdue tasks and notify users via in-app + Teams.

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
    const teamsWebhookUrl = Deno.env.get("TEAMS_WEBHOOK_URL");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const today = getISTParts(new Date());
    const nowIso = new Date().toISOString();

    // Find overdue tasks (due_date < now, not completed, no blocker)
    const { data: overdueTasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, assigned_to, title, due_date, priority, department, created_by")
      .neq("status", "completed")
      .lt("due_date", nowIso);

    if (tasksErr) throw tasksErr;

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ updated: 0, notified: 0 }), {
        headers: { "content-type": "application/json" },
      });
    }

    const taskIds = overdueTasks.map((t: any) => t.id);
    let notified = 0;

    // Insert in-app notifications for assigned users
    for (const task of overdueTasks) {
      const { error: notifErr } = await supabase.from("notifications").insert({
        recipient_id: task.assigned_to,
        sender_id: null,
        type: "task_overdue",
        title: "Overdue Task",
        message: `"${task.title}" is overdue (due: ${task.due_date}). Please update status or unblock.`,
        data: { task_id: task.id, due_date: task.due_date, priority: task.priority },
        read: false,
      });
      if (!notifErr) notified++;
    }

    // Send Teams notification for each overdue task
    if (teamsWebhookUrl) {
      for (const task of overdueTasks) {
        const card = {
          "@type": "MessageCard" as const,
          "@context": "http://schema.org/extensions" as const,
          themeColor: "FF0000",
          title: "⚠️ Overdue Task",
          sections: [
            {
              text: `Task **"${task.title}"** is overdue. Please update status or unblock.`,
              facts: [
                { name: "Due Date", value: task.due_date || "N/A" },
                { name: "Priority", value: task.priority || "medium" },
                { name: "Department", value: task.department || "N/A" },
              ],
            },
          ],
          potentialAction: [
            {
              "@type": "OpenUri" as const,
              name: "Open Task",
              targets: [{ os: "default", uri: `${supabaseUrl.replace("https://", "https://").replace("http://", "http://")}/workforce/tasks` }],
            },
          ],
        };

        await fetch(teamsWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(card),
        });
      }
    }

    return new Response(JSON.stringify({ updated: taskIds.length, notified, teamsSent: !!teamsWebhookUrl }), {
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
