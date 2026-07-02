import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request, { params }: { params: { certificateId: string } }) {
  try {
    const { data: certificate, error } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        *,
        course:academy_courses!inner(title)
      `)
      .eq("certificate_id", params.certificateId)
      .single();

    if (error || !certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const courseTitle = escapeHtml(Array.isArray(certificate.course) ? certificate.course[0]?.title || "" : certificate.course?.title || "");
    const userEmail = certificate.user_email || "";
    const userName = escapeHtml(certificate.user_name || "");
    const issuedDate = certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://localwala.tech";
    const verifyUrl = `${BASE_URL}/academy/certificates/verify/${certificate.certificate_id}`;
    const certificateUrl = `${BASE_URL}/academy/certificates/${certificate.certificate_id}`;

    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificate Awarded - WeWorkLocal Academy</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #059669 0%, #0891b2 100%); padding: 36px 30px; text-align: center;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <div style="width: 44px; height: 44px; background: white; border-radius: 10px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #059669; font-size: 18px;">LW</div>
                            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: white;">WeWorkLocal Academy</h1>
                            <p style="margin: 6px 0 0; opacity: 0.92; font-size: 13px; color: white;">Certificate of Achievement</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 30px 24px;">
                      <p style="margin: 0 0 6px; font-size: 14px; color: #6b7280;">Dear ${userName},</p>
                      <p style="margin: 0 0 20px; font-size: 14px; color: #1F2937; line-height: 1.6;">
                        Congratulations on your achievement. You have successfully completed the course and your certificate is now available.
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; overflow: hidden; margin: 16px 0;">
                        <tr>
                          <td style="padding: 18px 20px;">
                            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Awarded Course</p>
                            <p style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: #111827;">${courseTitle}</p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="33%" style="padding: 6px 0; border-right: 1px solid #e5e7eb;">
                                  <p style="margin: 0; font-size: 10px; color: #6b7280; text-transform: uppercase;">Score</p>
                                  <p style="margin: 2px 0 0; font-size: 14px; font-weight: 700; color: #111827;">${certificate.score}%</p>
                                </td>
                                <td width="33%" style="padding: 6px 14px; border-right: 1px solid #e5e7eb;">
                                  <p style="margin: 0; font-size: 10px; color: #6b7280; text-transform: uppercase;">Issue Date</p>
                                  <p style="margin: 2px 0 0; font-size: 14px; font-weight: 700; color: #111827;">${issuedDate}</p>
                                </td>
                                <td width="34%" style="padding: 6px 0 6px 14px;">
                                  <p style="margin: 0; font-size: 10px; color: #6b7280; text-transform: uppercase;">Certificate ID</p>
                                  <p style="margin: 2px 0 0; font-size: 12px; font-weight: 700; color: #111827; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${certificate.certificate_id}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                        <tr>
                          <td align="center">
                            <a href="${certificateUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Certificate</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                        You can use this certificate for internship applications at LocalWala. Employers can verify its authenticity at any time using the link below.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 30px; border-top: 1px solid #e5e7eb; background: #f8fafc;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 12px; color: #6b7280;">
                            <p style="margin: 0 0 4px; font-weight: 600; color: #374151;">Need help?</p>
                            <p style="margin: 0;">Contact us at <a href="mailto:academy@localwala.tech" style="color: #059669; text-decoration: none;">academy@localwala.tech</a></p>
                          </td>
                          <td align="right" style="font-size: 11px; color: #9ca3af;">
                            Verify: ${verifyUrl}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const { data, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "LocalWala Academy <academy@localwala.tech>",
      to: userEmail,
      subject: `🎓 Certificate Awarded - ${courseTitle}`,
      html,
    });

    if (sendError) {
      console.error("[certificate-email] error:", sendError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
