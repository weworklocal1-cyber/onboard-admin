// @ts-nocheck
// Supabase Edge Function: task-overdue-reminder
// Runs daily to find tasks past their due date and sends in-app notifications
// plus emails to assignees and creators.

import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend@^6";

type DenoEnv = { env: { get: (k: string) => string | undefined } };
declare const Deno: DenoEnv;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "LocalWala Workforce <workforce@localwala.tech>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

Deno.serve(async (_req: Request) => {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: overdueTasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        status,
        created_by,
        assigned_to,
        creator:profiles!created_by(email, full_name),
        assignees:task_assignees(
          employee_id,
          employee:profiles!employee_id(email, full_name)
        )
      `)
      .lt("due_date", today)
      .not("due_date", "is", null)
      .in(
        "status",
        ["todo", "in_progress", "in_review", "blocked", "pending"]
      );

    if (tasksError) throw tasksError;

    const tasks = overdueTasks || [];
    if (tasks.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, date: today }), {
        headers: { "content-type": "application/json" },
      });
    }

    const notificationsToInsert: any[] = [];
    const emailPromises: Promise<void>[] = [];

    for (const task of tasks) {
      const taskId = task.id;
      const taskTitle = task.title;
      const assignedTo = task.assigned_to;

      if (assignedTo) {
        notificationsToInsert.push({
          recipient_id: assignedTo,
          sender_id: null,
          type: "task_overdue",
          title: "Task Overdue",
          message: `Task "${taskTitle}" was due on ${task.due_date} and is now overdue.`,
          data: { task_id: taskId, due_date: task.due_date },
          read: false,
        });

        const assigneeProfile = (task as any).assignees?.find(
          (a: any) => a.employee_id === assignedTo
        )?.employee;

        if (assigneeProfile?.email && resend) {
          emailPromises.push(
            resend.emails.send({
              from: FROM_EMAIL,
              to: assigneeProfile.email,
              subject: `Overdue Task: ${taskTitle}`,
              html: getOverdueEmailHtml(
                assigneeProfile.full_name,
                taskTitle,
                task.due_date,
                taskId
              ),
            }).then(() => {}).catch((e: Error) => console.error("Failed to send overdue email to assignee:", e))
          );
        }
      }

      const creatorId = task.created_by;
      if (creatorId && creatorId !== assignedTo) {
        notificationsToInsert.push({
          recipient_id: creatorId,
          sender_id: null,
          type: "task_overdue",
          title: "Task Overdue",
          message: `Task "${taskTitle}" (assigned) was due on ${task.due_date} and is now overdue.`,
          data: { task_id: taskId, due_date: task.due_date },
          read: false,
        });

        const creatorProfile = (task as any).creator;
        if (creatorProfile?.email && resend) {
          emailPromises.push(
            resend.emails.send({
              from: FROM_EMAIL,
              to: creatorProfile.email,
              subject: `Overdue Task Created: ${taskTitle}`,
              html: getOverdueEmailHtml(
                creatorProfile.full_name,
                taskTitle,
                task.due_date,
                taskId,
                true
              ),
            }).then(() => {}).catch((e: Error) => console.error("Failed to send overdue email to creator:", e))
          );
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);

      if (insertError) throw insertError;
    }

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ inserted: notificationsToInsert.length, date: today }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});

function getOverdueEmailHtml(
  name: string,
  title: string,
  dueDate: string,
  taskId: string,
  isCreator = false
): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const roleText = isCreator
    ? "a task you created is now overdue"
    : "the following task assigned to you is now overdue";

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #F59E0B; margin-bottom: 16px;">Task Overdue</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        ${roleText}: <strong>${title}</strong><br />
        Due date: <strong>${dueDate}</strong>
      </p>
      <a href="${Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://onboard.localwala.tech"}/workforce/tasks"
         style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Task
      </a>
      <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
        You received this email from LocalWala Workforce Hub.
      </p>
    </div>
  `;
}
