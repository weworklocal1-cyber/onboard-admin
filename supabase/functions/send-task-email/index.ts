import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LocalWala Workforce <workforce@localwala.tech>";

function getTaskUrl(taskId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://onboard.localwala.tech";
  return `${baseUrl}/workforce/tasks`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, task_id, task_title, recipient_name } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: "Missing required fields: to, subject" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const finalHtml = html || getDefaultTemplate(subject, task_title, task_id, recipient_name);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: finalHtml,
    });

    if (error) {
      console.error("[send-task-email] error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[send-task-email] unexpected error:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

function getDefaultTemplate(
  subject: string,
  taskTitle: string | null,
  taskId: string | null,
  recipientName: string | null
): string {
  const taskUrl = taskId ? getTaskUrl(taskId) : "#";
  const displayTitle = taskTitle || "a task";
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";

  if (subject.includes("assigned")) {
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #FF6B35; margin-bottom: 16px;">New Task Assigned</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          You have been assigned a new task: <strong>${displayTitle}</strong>
        </p>
        <a href="${taskUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Task
        </a>
        <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
          You received this email because you are assigned to a task on LocalWala Workforce Hub.
        </p>
      </div>
    `;
  }

  if (subject.includes("Blocked")) {
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #EF4444; margin-bottom: 16px;">Task Blocked</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          The following task has been marked as blocked and requires your attention: <strong>${displayTitle}</strong>
        </p>
        <a href="${taskUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Task
        </a>
        <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
          You received this email because you are assigned to or created this task on LocalWala Workforce Hub.
        </p>
      </div>
    `;
  }

  if (subject.includes("Overdue")) {
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #F59E0B; margin-bottom: 16px;">Task Overdue</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          The following task is now overdue and needs immediate attention: <strong>${displayTitle}</strong>
        </p>
        <a href="${taskUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Task
        </a>
        <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
          You received this email because you are assigned to or created this task on LocalWala Workforce Hub.
        </p>
      </div>
    `;
  }

  if (subject.includes("Approved") || subject.includes("Rejected")) {
    const isApproved = subject.includes("Approved");
    const color = isApproved ? "#10B981" : "#EF4444";
    const action = isApproved ? "approved" : "rejected";

    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: ${color}; margin-bottom: 16px;">Task ${action.charAt(0).toUpperCase() + action.slice(1)}</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          The task <strong>${displayTitle}</strong> has been <strong>${action}</strong>.
        </p>
        <a href="${taskUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Task
        </a>
        <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
          You received this email because you are assigned to this task on LocalWala Workforce Hub.
        </p>
      </div>
    `;
  }

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #FF6B35; margin-bottom: 16px;">Task Update</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        There is an update on task: <strong>${displayTitle}</strong>
      </p>
      <a href="${taskUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Task
      </a>
      <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
        You received this email because you are assigned to or created this task on LocalWala Workforce Hub.
      </p>
    </div>
  `;
}
