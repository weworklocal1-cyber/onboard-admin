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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { course_id, score, percentage } = body as { course_id: string; score: number; percentage: number };

    if (!course_id) {
      return NextResponse.json({ error: "Missing course_id" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("academy_certificates")
      .select("certificate_id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, certificate_id: existing.certificate_id, already_issued: true });
    }

    const certificateId = `LWC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const userName = (user.user_metadata?.full_name as string) || (user as any).full_name || "";
    const userEmail = user.email || "";

    const { data: certificate, error } = await supabaseAdmin
      .from("academy_certificates")
      .insert({
        certificate_id: certificateId,
        user_id: user.id,
        course_id,
        score: percentage,
        user_name: userName,
        user_email: userEmail,
      })
      .select("certificate_id")
      .single();

    if (error || !certificate) {
      console.error("[issue-certificate] insert error:", error);
      return NextResponse.json({ error: "Failed to issue certificate" }, { status: 500 });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data: certFull } = await supabaseAdmin
          .from("academy_certificates")
          .select(`
            *, course:academy_courses!inner(title)
          `)
          .eq("certificate_id", certificate.certificate_id)
          .single();

        if (certFull) {
          const courseTitle = escapeHtml(Array.isArray(certFull.course) ? certFull.course[0]?.title || "" : certFull.course?.title || "");
          const userEmail = certFull.user_email || user.email || "";
          const userName = escapeHtml(certFull.user_name || (user.user_metadata?.full_name as string) || "");

          if (userEmail) {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "LocalWala Academy <academy@localwala.tech>",
              to: userEmail,
              subject: `🎓 Congratulations! You earned a certificate from WeWorkLocal Academy`,
              html: `
                <!DOCTYPE html>
                <html>
                  <head><meta charset="utf-8"><style>
                    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #059669 0%, #0891b2 100%); padding: 40px 30px; text-align: center; color: white; }
                    .header h1 { margin: 0 0 10px; font-size: 28px; }
                    .body { padding: 40px 30px; text-align: center; }
                    .cert-info { background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 24px; margin: 24px 0; }
                    .cert-info h2 { margin: 0 0 8px; color: #059669; font-size: 20px; }
                    .button { display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
                    .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                  </style></head>
                  <body>
                    <div class="container">
                      <div class="header"><h1>🎓 Congratulations!</h1><p>You've earned a certificate from WeWorkLocal Academy</p></div>
                      <div class="body">
                        <p>Dear ${userName},</p>
                        <p>Congratulations on completing the course! Your certificate is now available.</p>
                        <div class="cert-info">
                          <h2>${courseTitle}</h2>
                          <p><strong>Score:</strong> ${percentage}%</p>
                          <p><strong>Certificate ID:</strong> ${certificate.certificate_id}</p>
                          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        <a href="https://localwala.tech/academy/certificates/${certificate.certificate_id}" class="button">View Certificate</a>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">You can now apply for LocalWala internships with this certificate.</p>
                      </div>
                      <div class="footer"><p>Powered by LocalWala & WeWorkLocal</p></div>
                    </div>
                  </body>
                </html>
              `,
            });
          }
        }
      } catch (emailError) {
        console.error("[issue-certificate] email error:", emailError);
      }
    }

    return NextResponse.json({ success: true, certificate_id: certificate.certificate_id });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
