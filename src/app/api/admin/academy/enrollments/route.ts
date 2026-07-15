import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return data;
}

function isAuthorizedAdmin(role?: string): boolean {
  return role === 'super_admin' || role === 'admin';
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin || !isAuthorizedAdmin(admin.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: enrollments, error } = await supabaseAdmin
      .from("academy_enrollments")
      .select(`
        id,
        user_id,
        course_id,
        status,
        enrolled_at,
        completed_at,
        course:academy_courses!inner(id, title, slug, difficulty, duration_minutes)
      `)
      .order("enrolled_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(new Set((enrollments || []).map((e: any) => e.user_id).filter(Boolean)));
    const courseIds = Array.from(new Set((enrollments || []).map((e: any) => e.course_id).filter(Boolean)));

    const [profilesResult, coursesResult] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email, phone").in("id", userIds)
        : { data: [] as any[] },
      courseIds.length
        ? supabaseAdmin.from("academy_courses").select("id, title, slug, difficulty, duration_minutes").in("id", courseIds)
        : { data: [] as any[] },
    ]);

    const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));
    const coursesMap = new Map((coursesResult.data || []).map((c: any) => [c.id, c]));

    for (const enrollment of (enrollments || [])) {
      if (!profilesMap.has(enrollment.user_id)) {
        try {
          const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);
          const authUser = authUserData?.user;
          if (authUser) {
            profilesMap.set(enrollment.user_id, {
              id: enrollment.user_id,
              full_name: (authUser as any).user_metadata?.full_name || (authUser as any).full_name || "",
              email: authUser.email || "",
              phone: (authUser as any).phone || "",
            });
          }
        } catch {}
      }
    }

    const result = (enrollments || []).map((enrollment: any) => {
      const profile = profilesMap.get(enrollment.user_id);
      const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
      const courseExtra = coursesMap.get(enrollment.course_id);
      return {
        id: enrollment.id,
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        status: enrollment.status,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        user_name: profile?.full_name || "Unknown",
        user_email: profile?.email || "",
        user_phone: profile?.phone || "",
        course_title: course?.title || courseExtra?.title || "Unknown Course",
        course_slug: course?.slug || courseExtra?.slug || "",
        course_difficulty: course?.difficulty || courseExtra?.difficulty || "",
        course_duration: course?.duration_minutes || courseExtra?.duration_minutes || 0,
      };
    });

    return NextResponse.json({ enrollments: result });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin || !isAuthorizedAdmin(admin.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enrollment_id } = body as { enrollment_id: string };

    if (!enrollment_id) {
      return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
    }

    const { data: enrollment, error: fetchError } = await supabaseAdmin
      .from("academy_enrollments")
      .select("*")
      .eq("id", enrollment_id)
      .single();

    if (fetchError || !enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("academy_enrollments")
      .update({ status: "confirmed", completed_at: new Date().toISOString() })
      .eq("id", enrollment_id);

    if (updateError) {
      console.error("[enrollments-patch] update error:", updateError);
      return NextResponse.json({ error: "Update failed", details: updateError.message }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, phone, full_name")
      .eq("id", enrollment.user_id)
      .single();

    let userEmail = profile?.email || "";
    let userName = profile?.full_name || "Student";
    let userPhone = profile?.phone || "";

    if (!userEmail || !userName || !userPhone) {
      try {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);
        const authUser = authUserData?.user;
        if (authUser) {
          userEmail = userEmail || authUser.email || "";
          userName = userName || (authUser as any).user_metadata?.full_name || (authUser as any).full_name || "Student";
          userPhone = userPhone || (authUser as any).phone || "";
        }
      } catch {}
    }

    const { data: course } = await supabaseAdmin
      .from("academy_courses")
      .select("title")
      .eq("id", enrollment.course_id)
      .single();

    const courseTitle = course?.title || "the course";

    const { data: cohort } = await supabaseAdmin
      .from("intern_cohorts")
      .select("whatsapp_group_link")
      .eq("name", "Confirmed Interns")
      .single();

    const whatsappGroupLink = cohort?.whatsapp_group_link || "";

    const message = `Hi ${userName},\n\nCongratulations! Your enrollment in "${courseTitle}" has been confirmed. We are excited to have you on board.\n\nPlease login to your academy dashboard to start learning.${whatsappGroupLink ? `\n\nJoin our WhatsApp group: ${whatsappGroupLink}` : ""}\n\nBest regards,\nLocawala Team`;

    const emailHtml = `Hi ${userName},<br><br>Congratulations! Your enrollment in "<strong>${courseTitle}</strong>" has been confirmed. We are excited to have you on board.<br><br>Please login to your academy dashboard to start learning.${whatsappGroupLink ? `<br><br>Join our WhatsApp group: <a href="${whatsappGroupLink}">${whatsappGroupLink}</a>` : ""}<br><br>Best regards,<br>Locawala Team`;

    if (userPhone) {
      const token = process.env.WHATSAPP_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const cleanPhone = userPhone.replace(/[^\d]/g, "");

      if (token && phoneId) {
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "text",
              text: { body: message },
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("[enrollments-patch] whatsapp send failed:", res.status, text);
          }
        } catch (err) {
          console.error("[enrollments-patch] whatsapp send error:", err);
        }
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (resendKey && userEmail) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        const sendResult =         await resend.emails.send({
          from: fromEmail,
          to: userEmail,
          subject: `Locawala Academy - Enrollment Confirmed: ${courseTitle}`,
          html: emailHtml,
        });

        if (sendResult.error) {
          console.error("[enrollments-patch] email send error:", sendResult.error);
        }
      } catch (err) {
        console.error("[enrollments-patch] email send unexpected error:", err);
      }
    }

    return NextResponse.json({ success: true, status: "confirmed" });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
