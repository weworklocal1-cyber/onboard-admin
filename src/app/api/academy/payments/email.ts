import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LocalWala Academy <academy@localwala.tech>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://onboard.localwala.tech";

type PaymentAction = "proof_submitted" | "approved" | "rejected";

const colorMap: Record<PaymentAction, string> = {
  proof_submitted: "#6366F1",
  approved: "#10B981",
  rejected: "#EF4444",
};

export async function sendPaymentEmail({
  to,
  subject,
  recipientName,
  action,
  courseTitle,
  orderId,
  amount,
  currency,
  proofUrl,
  adminNote,
}: {
  to: string;
  subject: string;
  recipientName?: string;
  action: PaymentAction;
  courseTitle?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  proofUrl?: string;
  adminNote?: string;
}) {
  if (!process.env.RESEND_API_KEY || !to) return;

  const color = colorMap[action];
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";

  const messages: Record<PaymentAction, { title: string; body: string }> = {
    proof_submitted: {
      title: "New Payment Proof Submitted",
      body: `A new payment proof has been submitted for <strong>${courseTitle || "a course"}</strong>. Please review it in the admin panel.`,
    },
    approved: {
      title: "Payment Approved",
      body: `Your payment for <strong>${courseTitle || "the course"}</strong> has been approved. You are now enrolled and can start learning.`,
    },
    rejected: {
      title: "Payment Rejected",
      body: `Your payment proof for <strong>${courseTitle || "the course"}</strong> has been rejected.${adminNote ? ` Reason: <strong>${adminNote}</strong>` : ""} Please contact support if you have questions.`,
    },
  };

  const { title, body } = messages[action];

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: ${color}; margin-bottom: 16px;">${title}</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">${body}</p>
      ${orderId ? `<p style="color: #374151; font-size: 14px; margin-top: 12px;">Order ID: <strong>${orderId}</strong></p>` : ""}
      ${amount != null ? `<p style="color: #374151; font-size: 14px;">Amount: <strong>${currency || "INR"} ${amount}</strong></p>` : ""}
      ${action === "approved" ? `<a href="${APP_URL}/courses" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to My Courses</a>` : ""}
      ${action === "proof_submitted" && proofUrl ? `<p style="margin-top: 12px;"><a href="${proofUrl}" target="_blank" style="color: #2563EB;">View Payment Proof</a></p>` : ""}
      <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">You received this email from LocalWala Academy.</p>
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
    console.error("Failed to send payment email:", emailErr);
  }
}
