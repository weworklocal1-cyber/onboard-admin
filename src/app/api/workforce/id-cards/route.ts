import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import QRCode from "qrcode";

const COLORS = {
  primary: "#FF6B00",
  navy: "#111827",
  white: "#FFFFFF",
  lightGray: "#F8FAFC",
  softGray: "#E5E7EB",
};

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

async function generateQrDataUrl(employeeId: string): Promise<string> {
  try {
    // Use production URL for ID cards
    return await QRCode.toDataURL(`https://localwala.tech/verify/${employeeId}`, {
      width: 300,
      margin: 3,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      }
    });
  } catch {
    return "";
  }
}

async function generateIdCardFront(employee: {
  full_name: string;
  employee_id: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  profile_picture_url: string | null;
  joining_date?: string | null;
  emergency_contact?: string | null;
}): Promise<string> {
  const initials = employee.full_name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const photoHtml = employee.profile_picture_url
    ? `<img src="${employee.profile_picture_url}" alt="${employee.full_name}" style="width: 100px; height: 100px; border-radius: 12px; object-fit: cover; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 0 auto;" />`
    : `<div style="width: 100px; height: 100px; border-radius: 12px; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary}80 100%); color: white; font-weight: 800; font-size: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 0 auto;">${initials}</div>`;

  const joinDate = employee.joining_date
    ? new Date(employee.joining_date).toLocaleDateString()
    : "";

  return `
    <div style="width: 53.98mm; height: 85.6mm; border: 2px solid ${COLORS.primary}; padding: 10px; font-family: Arial, sans-serif; box-sizing: border-box; margin: 5mm; border-radius: 16px; position: relative; background: radial-gradient(circle at 20% 0%, ${COLORS.lightGray} 0%, ${COLORS.white} 100%);">
      <div style="padding: 12px 8px 6px; text-align: center;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: ${COLORS.navy}; letter-spacing: -0.5px;">LOCALWALA</h2>
        <p style="margin: 1px 0 4px; font-size: 8px; color: ${COLORS.primary}; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Powered by WeWorkLocal</p>
        <div style="height: 1px; background: linear-gradient(90deg, transparent, ${COLORS.primary}, transparent); margin: 0 auto; width: 40px;"></div>
      </div>
      <div style="padding: 0 16px; margin-bottom: 6px;">
        ${photoHtml}
      </div>
      <div style="padding: 0 10px; text-align: center;">
        <h3 style="margin: 0 0 3px; font-size: 14px; font-weight: 800; color: ${COLORS.navy}; letter-spacing: -0.3px; text-transform: uppercase;">${employee.full_name}</h3>
        <div style="margin-bottom: 6px;">
          <span style="font-size: 9px; padding: 2px 8px; border-radius: 9999px; border: 1px solid ${COLORS.primary}; color: ${COLORS.primary}; font-weight: 600; text-transform: uppercase;">${employee.department || "Employee"}</span>
        </div>
<div style="font-size: 9px; color: ${COLORS.navy}; line-height: 1.6;">
           <div style="margin-bottom: 1px;"><strong>ID:</strong> ${employee.employee_id}</div>
           ${employee.designation ? `<div style="margin-bottom: 1px;"><strong>${employee.designation}</strong></div>` : ""}
           <div style="margin-bottom: 1px;"><strong>Email:</strong> ${employee.email}</div>
           ${employee.phone ? `<div style="margin-bottom: 1px;"><strong>Mobile:</strong> ${employee.phone}</div>` : ""}
           ${employee.emergency_contact ? `<div style="margin-bottom: 1px; font-size: 8px;"><strong>Emergency:</strong> ${employee.emergency_contact}</div>` : ""}
           ${joinDate ? `<div style="font-size: 8px; color: ${COLORS.softGray}; margin-top: 2px;">Joined: ${joinDate}</div>` : ""}
         </div>
       </div>
       <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 5px 8px; background: linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primary}80 100%); text-align: center;">
         <div style="font-size: 7px; color: ${COLORS.white}; display: flex; justify-content: center; gap: 8px;">
           <span>✓ Verified</span>
           <span>• Official ID</span>
           <span>• Valid Network</span>
         </div>
       </div>
     </div>
   `;
}

async function generateIdCardBack(employee: { employee_id: string }): Promise<string> {
  const qrCode = await generateQrDataUrl(employee.employee_id);
  return `
    <div style="width: 53.98mm; height: 85.6mm; padding: 10px; font-family: Arial, sans-serif; box-sizing: border-box; margin: 5mm; border-radius: 16px; background: ${COLORS.navy}; color: ${COLORS.white}; display: flex; flex-direction: column;">
      <div style="padding: 12px 8px 6px; text-align: center;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: ${COLORS.primary}; letter-spacing: -0.5px;">LOCALWALA</h3>
        <p style="margin: 1px 0 0; font-size: 8px; color: ${COLORS.softGray}; font-weight: 500;">Powered by WeWorkLocal</p>
      </div>
      <div style="text-align: center; padding: 16px 0; flex: 1;">
        <div style="width: 210px; height: 210px; margin: 0 auto 6px; background: ${COLORS.white}; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 4px;">
          <img src="${qrCode}" style="width: 200px; height: 200px;" alt="QR"/>
        </div>
        <p style="font-size: 10px; color: ${COLORS.softGray}; margin: 0; font-weight: 500;">Scan to Verify Identity</p>
      </div>
      <div style="padding: 0 16px; font-size: 8px; color: ${COLORS.softGray}; line-height: 1.8;">
        <div style="margin-bottom: 3px;"><strong style="color: ${COLORS.primary};">Website:</strong></div>
        <div style="margin-bottom: 6px; font-size: 8px;">www.localwala.tech</div>
        <div style="margin-bottom: 3px;"><strong style="color: ${COLORS.primary};">Support:</strong></div>
        <div style="margin-bottom: 6px; font-size: 8px;">support@localwala.tech</div>
        <div style="margin-bottom: 3px;"><strong style="color: ${COLORS.primary};">Phone:</strong></div>
        <div style="font-size: 8px;">+91 XXXXX XXXXX</div>
      </div>
      <div style="margin: 8px 12px; padding: 8px 10px; background: ${COLORS.white}; border-radius: 8px; width: calc(100% - 24px);">
        <p style="margin: 0; font-size: 8px; color: ${COLORS.navy}; font-weight: 600; margin-bottom: 3px;">EMERGENCY CONTACT</p>
        <p style="margin: 1px 0; font-size: 7px; color: ${COLORS.navy};">HR Helpline: +91 XXXXX XXXXX</p>
        <p style="margin: 1px 0; font-size: 7px; color: ${COLORS.navy};">Support: support@localwala.tech</p>
      </div>
      <div style="width: 100%; padding: 6px 0; background: linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primary}80 100%); text-align: center; margin-top: auto;">
        <p style="margin: 0; font-size: 7px; color: ${COLORS.white}; font-weight: 600; letter-spacing: 0.5px;">SECURE DIGITAL IDENTITY</p>
      </div>
    </div>
  `;
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ADMIN_ROLES = ["founder", "super_admin", "hr_admin"];
  if (!ADMIN_ROLES.includes(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const { data: employees, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (format === "pdf") {
    const cards = [];
    for (const e of employees || []) {
      cards.push(await generateIdCardFront(e), await generateIdCardBack({ employee_id: e.employee_id }));
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 15mm; font-family: Arial, sans-serif; background: #f8fafc; }
            .cards-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10mm; }
          </style>
        </head>
        <body>
          <div class="cards-container">${cards.join("")}</div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="employee-id-cards.html"`,
      },
    });
  }

  if (format === "word") {
    const wordContent = employees?.map(e => `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h3 style="color: ${COLORS.primary}; margin: 0 0 8px;">${e.full_name} - ${e.employee_id}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr><td style="padding: 4px; border: 1px solid ${COLORS.softGray};"><strong>Department:</strong></td><td style="padding: 4px; border: 1px solid ${COLORS.softGray};">${e.department || "N/A"}</td></tr>
          <tr><td style="padding: 4px; border: 1px solid ${COLORS.softGray};"><strong>Designation:</strong></td><td style="padding: 4px; border: 1px solid ${COLORS.softGray};">${e.designation || "N/A"}</td></tr>
          <tr><td style="padding: 4px; border: 1px solid ${COLORS.softGray};"><strong>Email:</strong></td><td style="padding: 4px; border: 1px solid ${COLORS.softGray};">${e.email}</td></tr>
          <tr><td style="padding: 4px; border: 1px solid ${COLORS.softGray};"><strong>Phone:</strong></td><td style="padding: 4px; border: 1px solid ${COLORS.softGray};">${e.phone || "N/A"}</td></tr>
          <tr><td style="padding: 4px; border: 1px solid ${COLORS.softGray};"><strong>Emergency Contact:</strong></td><td style="padding: 4px; border: 1px solid ${COLORS.softGray};">${e.emergency_contact || "N/A"}</td></tr>
          <tr><td style="padding: 4px; border: 1px solid ${COLORS.softGray};"><strong>Join Date:</strong></td><td style="padding: 4px; border: 1px solid ${COLORS.softGray};">${e.joining_date ? new Date(e.joining_date).toLocaleDateString() : "N/A"}</td></tr>
        </table>
        <p style="font-size: 9px; color: ${COLORS.softGray}; margin-top: 8px;">This card remains the property of LocalWala. If found, please return to the nearest office.</p>
      </div>
    `).join("") || "";

    const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<html xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <head><meta charset="utf-8"></head>
  <body>
    <h2 style="color: ${COLORS.primary};">Employee ID Cards - LocalWala</h2>
    ${wordContent}
  </body>
</html>`;

    return new NextResponse(wordXml, {
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="employee-id-cards.doc"`,
      },
    });
  }

  return NextResponse.json({ employees });
}

export const dynamic = "force-dynamic";