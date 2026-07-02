import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import QRCode from "qrcode";

const COLORS = {
  primary: "#059669",
  secondary: "#0891b2",
  white: "#FFFFFF",
  lightGray: "#F8FAFC",
  softGray: "#E5E7EB",
  navy: "#111827",
  darkText: "#1F2937",
};

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  return { id: user.id };
}

async function generateQrDataUrl(certificateId: string, request: Request): Promise<string> {
  // Determine base URL: prefer env var, fallback to request origin (including protocol)
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
  const BASE_URL = envBase ?? (host ? `${protocol}://${host}` : "https://localwala.tech");
  const verifyUrl = `${BASE_URL}/academy/certificates/verify/${certificateId}`;
  try {
    return await QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch (error) {
    console.error("QR generation failed:", error);
    return "";
  }
}


export async function GET(request: Request, { params }: { params: { certificateId: string } }) {
  // Public endpoint – no session required
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

  const qrCode = await generateQrDataUrl(certificate.certificate_id, request);
  const courseTitle = Array.isArray(certificate.course) ? certificate.course[0]?.title : certificate.course?.title;
  const userName = certificate.user_name || "";
  const issuedDate = certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://localwala.tech"}/academy/certificates/verify/${certificate.certificate_id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Certificate - ${userName}</title>
        <style>
          @page { size: A4 landscape; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 12mm; }
          .certificate { width: 100%; max-width: 11in; background: ${COLORS.white}; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 18mm 22mm; position: relative; }
          .header::after { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #059669, #0891b2, #059669); }
          .header-inner { display: flex; align-items: flex-start; justify-content: space-between; }
          .brand-label { font-size: 9pt; font-weight: 700; color: #34d399; letter-spacing: 0.15em; text-transform: uppercase; }
          .header-title { font-size: 20pt; font-weight: 800; color: ${COLORS.white}; margin-top: 4px; letter-spacing: -0.02em; }
          .cert-id { text-align: right; }
          .cert-id-label { font-size: 8pt; color: #94a3b8; letter-spacing: 0.15em; text-transform: uppercase; }
          .cert-id-value { font-size: 9pt; font-family: monospace; color: #cbd5e1; margin-top: 2px; }
          .body { padding: 18mm 22mm; }
          .intro { text-align: center; margin-bottom: 14mm; }
          .intro-label { font-size: 10pt; font-weight: 600; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; }
          .recipient { font-size: 26pt; font-weight: 800; color: #0f172a; margin-top: 8px; letter-spacing: -0.02em; }
          .completion { text-align: center; margin-bottom: 14mm; }
          .completion-label { font-size: 10pt; font-weight: 600; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; }
          .course-name { font-size: 18pt; font-weight: 700; color: #0891b2; margin-top: 8px; }
          .meta-row { display: flex; align-items: center; justify-content: center; gap: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
          .meta-item { text-align: center; }
          .meta-label { font-size: 8pt; font-weight: 700; color: #94a3b8; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 2px; }
          .meta-value { font-size: 16pt; font-weight: 700; color: #0f172a; }
          .qr-section { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 14mm; }
          .qr-image { width: 80px; height: 80px; border: 1px solid #e2e8f0; padding: 3px; background: white; }
          .qr-label { font-size: 8pt; color: #94a3b8; letter-spacing: 0.12em; text-transform: uppercase; }
          .signature-area { margin-top: 16mm; padding-top: 10mm; border-top: 1px solid #e2e8f0; display: flex; align-items: flex-start; justify-content: space-between; }
          .signer { text-align: center; flex: 1; }
          .founder-signature { font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 20pt; color: #0f172a; font-weight: 700; margin-bottom: 6px; }
          .signer-line { width: 120px; height: 1px; background: #334155; margin: 0 auto 6px; }
          .signer-title { font-size: 9pt; font-weight: 700; color: #475569; letter-spacing: 0.12em; text-transform: uppercase; }
          .stamp-wrapper { text-align: center; }
          .stamp { display: inline-flex; align-items: center; justify-content: center; width: 70px; height: 70px; border-radius: 50%; border: 3px solid #991b1b; position: relative; transform: rotate(-12deg); margin-bottom: 8px; }
          .stamp-inner { display: flex; flex-direction: column; line-height: 1.1; }
          .stamp-main { font-family: Arial, sans-serif; font-weight: 900; font-size: 8pt; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; }
          .stamp-stars { font-size: 9pt; color: #991b1b; letter-spacing: 2px; }
          .footer { padding: 8mm 22mm; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          .footer-text { font-size: 8pt; color: #94a3b8; text-align: center; letter-spacing: 0.05em; }
        </style>
        </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="header-inner">
              <div>
                <div class="brand-label">WeWorkLocal Academy</div>
                <div class="header-title">Certificate of Achievement</div>
              </div>
              <div class="cert-id">
                <div class="cert-id-label">Certificate ID</div>
                <div class="cert-id-value">${certificate.certificate_id}</div>
              </div>
            </div>
          </div>

          <div class="body">
            <div class="intro">
              <div class="intro-label">This certificate is proudly presented to</div>
              <div class="recipient">${userName}</div>
            </div>

            <div class="completion">
              <div class="completion-label">For successfully completing</div>
              <div class="course-name">${courseTitle}</div>
            </div>

            <div class="meta-row">
              <div class="meta-item">
                <div class="meta-label">Score</div>
                <div class="meta-value">${certificate.score}%</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Date Issued</div>
                <div class="meta-value">${issuedDate}</div>
              </div>
            </div>

            <div class="qr-section">
              ${qrCode ? `<img src="${qrCode}" alt="QR Code" class="qr-image" />` : ""}
              <div class="qr-label">Scan to verify</div>
            </div>

            <div class="signature-area">
              <div class="signer">
                <div class="founder-signature">Mandava Charan Teja</div>
                <div class="signer-line"></div>
                <div class="signer-title">Founder</div>
              </div>
              <div class="stamp-wrapper">
                <div class="stamp">
                  <div class="stamp-inner">
                    <div class="stamp-main">WeWorkLocal</div>
                    <div class="stamp-stars">★★★★</div>
                  </div>
                </div>
                <div class="signer-line" style="margin: 0 auto 6px"></div>
                <div class="signer-title">Authorized Stamp</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">Powered by LocalWala & WeWorkLocal | Verify at ${verifyUrl}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="certificate-${certificate.certificate_id}.html"`,
    },
  });
}

export const dynamic = "force-dynamic";
