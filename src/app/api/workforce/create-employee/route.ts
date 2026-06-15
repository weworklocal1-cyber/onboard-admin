import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { UserRole, Department, EmploymentType } from "@/types/workforce";
import { getPermissionRules } from "@/lib/permissions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getWelcomeEmailTemplate(fullName: string, tempPassword: string, loginUrl: string, userEmail: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; margin-top: 0;">Welcome to LocalWala, ${fullName}!</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">We're excited to have you join our team. Your account has been created successfully in our Workforce Hub system. Below are your login credentials and important information to get you started.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 8px 0;"><strong>Email:</strong> ${userEmail}</p>
          <p style="margin: 8px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        
        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 10px;">Getting Started</h3>
        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
          <li>Click the login button below to access the Workforce Hub</li>
          <li>You'll be prompted to change your password on first login</li>
          <li>If you have any questions, contact your administrator</li>
        </ul>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Login to Workforce Hub</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;"><small>Thank you for being part of LocalWala. We look forward to working with you!</small></p>
      </div>
    </div>
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
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/workforce/login`
        : "https://www.localwala.tech/workforce/login";

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
