import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { UserRole, Department, EmploymentType } from "@/types/workforce";
import { getPermissionRules } from "@/lib/permissions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getWelcomeEmailTemplate(fullName: string, tempPassword: string, loginUrl: string, userEmail: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to LocalWala</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f9fc; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
              <!-- Branded Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #FF6B00 0%, #FF8F3D 100%); padding: 40px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">Welcome to LocalWala!</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Your Workforce Hub account is ready</p>
                </td>
              </tr>
              
              <!-- Content Body -->
              <tr>
                <td style="padding: 40px 40px 30px 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568; font-weight: 400;">
                    Hello <strong>${fullName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
                    We are thrilled to welcome you to the LocalWala team! Your profile has been set up successfully on our **Workforce Hub**. Please use the credentials below to log in and get started.
                  </p>
                  
                  <!-- Credentials Box -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fdf6f0; border: 1px solid #ffe6d3; border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 24px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #cc5500; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Your Login Credentials</h3>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="padding: 6px 0; font-size: 15px; color: #718096; width: 30%;"><strong>Email:</strong></td>
                            <td style="padding: 6px 0; font-size: 15px; color: #1a202c; font-family: monospace; font-weight: 600;">${userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; font-size: 15px; color: #718096; width: 30%;"><strong>Password:</strong></td>
                            <td style="padding: 6px 0; font-size: 15px; color: #1a202c; font-family: monospace; font-weight: 600; background: #fff0e5; padding-left: 8px; border-radius: 4px; display: inline-block;">${tempPassword}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Steps to Get Started -->
                  <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #2d3748; font-weight: 700;">Steps to Get Started</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                      <td valign="top" style="padding: 0 12px 16px 0; font-size: 18px;">🔑</td>
                      <td style="padding-bottom: 16px; font-size: 15px; line-height: 1.5; color: #4a5568;">
                        Click the button below to visit the login page.
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding: 0 12px 16px 0; font-size: 18px;">🛡️</td>
                      <td style="padding-bottom: 16px; font-size: 15px; line-height: 1.5; color: #4a5568;">
                        You will be prompted to change your temporary password immediately upon your first sign-in.
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding: 0 12px 0 0; font-size: 18px;">📈</td>
                      <td style="font-size: 15px; line-height: 1.5; color: #4a5568;">
                        Complete your profile setup to access your team dashboard, attendance logs, and task manager.
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Premium Action Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 10px 0 20px 0;">
                        <a href="${loginUrl}" target="_blank" style="background-color: #FF6B00; background: linear-gradient(135deg, #FF6B00 0%, #FF8F3D 100%); color: #ffffff; display: inline-block; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.3); border: 1px solid #FF6B00;">Login to Workforce Hub</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #fafbfc; border-top: 1px solid #edf2f7; padding: 30px 40px; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 13px; color: #718096; line-height: 1.4;">
                    If you have any questions or require support, please contact our administrator at <a href="mailto:weworklocal1@gmail.com" style="color: #FF6B00; text-decoration: none; font-weight: 600;">weworklocal1@gmail.com</a>.
                  </p>
                  <p style="margin: 16px 0 0 0; font-size: 12px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                    © ${new Date().getFullYear()} LocalWala Food. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await getPermissionRules();
  const allowedRoles = new Set(rules.ADMIN_ROLES || []);
  if (!allowedRoles.has(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      full_name,
      email,
      phone,
      password,
      role,
      department,
      designation,
      employment_type,
      joining_date,
    } = body as {
      full_name: string;
      email: string;
      phone?: string;
      password: string;
      role: UserRole;
      department?: Department;
      designation?: string;
      employment_type: EmploymentType;
      joining_date?: string;
    };

    if (!full_name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const { data: activeRoles, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("name")
      .eq("is_active", true);

    if (roleError || !activeRoles?.length) {
      return NextResponse.json({ error: "Failed to load allowed roles" }, { status: 500 });
    }

    const validRoles = new Set(activeRoles.map((item) => item.name));
    if (!validRoles.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Failed to create user" },
        { status: 500 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: created.user.id,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        department: department || null,
        designation: designation?.trim() || null,
        employment_type,
        role,
        joining_date: joining_date || new Date().toISOString().split("T")[0],
      })
      .select("*")
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Send welcome email
    try {
      let appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
      
      try {
        const requestUrl = new URL(request.url);
        const requestOrigin = requestUrl.origin;
        // Dynamically override origin if we are testing locally or in Vercel preview
        if (!appOrigin || requestOrigin.includes("localhost") || requestOrigin.includes("vercel.app")) {
          appOrigin = requestOrigin;
        }
      } catch (err) {
        console.error("Failed to parse request URL for welcome email origin:", err);
      }

      if (!appOrigin) {
        appOrigin = "https://onboard.localwala.tech";
      }

      const loginUrl = `${appOrigin}/workforce/login`;

      const emailResult = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email.trim(),
        subject: "Welcome to LocalWala - Your Account is Ready",
        html: getWelcomeEmailTemplate(full_name.trim(), password, loginUrl, email.trim()),
      });

      if (emailResult.error) {
        console.error("Failed to send welcome email:", emailResult.error);
      } else {
        console.log("Welcome email sent:", emailResult.data?.id);
      }
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: created.user.id,
        employee_id: profile.employee_id,
        email,
        full_name,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
