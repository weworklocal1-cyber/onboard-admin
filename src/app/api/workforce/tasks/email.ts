import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LocalWala Workforce <workforce@localwala.tech>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://onboard.localwala.tech";

export async function sendTaskEmail({
  to,
  subject,
  taskTitle,
  taskId: _taskId,
  recipientName,
  action,
}: {
  to: string;
  subject: string;
  taskTitle: string;
  taskId: string;
  recipientName?: string;
  action?: "assigned" | "blocked" | "approved" | "rejected" | "overdue" | "completed" | "in_review";
}) {
  if (!process.env.RESEND_API_KEY || !to) return;
  const taskUrl = `${APP_URL}/workforce/tasks`;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";

  const colorMap: Record<string, string> = {
    assigned: "#FF6B35",
    blocked: "#EF4444",
    approved: "#10B981",
    rejected: "#EF4444",
    overdue: "#F59E0B",
    completed: "#3B82F6",
    in_review: "#6366F1",
  };
  const color = action ? colorMap[action] : "#FF6B35";

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: ${color}; margin-bottom: 16px;">${subject}</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Task: <strong>${taskTitle}</strong>
      </p>
      <a href="${taskUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Task
      </a>
      <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
        You received this email from LocalWala Workforce Hub.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (emailErr) {
    console.error("Failed to send task email:", emailErr);
  }
}
