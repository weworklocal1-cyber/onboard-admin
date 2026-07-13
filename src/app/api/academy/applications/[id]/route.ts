import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser(request);
  if (!admin || !isAuthorizedAdmin(admin.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status } = body as { status: string };

    if (!status) {
      return NextResponse.json({ error: "Missing field: status" }, { status: 400 });
    }

    const { id } = await params;

    const allowedStatuses = ["pending", "reviewed", "accepted", "rejected", "confirmed"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "confirmed") {
      updateData.confirmed_at = new Date().toISOString();
      updateData.confirmed_by = admin.id;
    }

    const { data: application, error } = await supabaseAdmin
      .from("internship_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("internship_applications")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("[applications-patch] update error:", updateError);
      return NextResponse.json({ error: "Update failed", details: updateError.message }, { status: 500 });
    }

    if (status === "confirmed") {
      const cohortName = "Confirmed Interns";

      let cohortId: string | null = null;
      let whatsappGroupLink: string | null = null;
      const { data: existingCohort } = await supabaseAdmin
        .from("intern_cohorts")
        .select("id, whatsapp_group_link")
        .eq("name", cohortName)
        .single();

      if (existingCohort) {
        cohortId = existingCohort.id;
        whatsappGroupLink = existingCohort.whatsapp_group_link;
      } else {
        const { data: newCohort, error: cohortError } = await supabaseAdmin
          .from("intern_cohorts")
          .insert({ name: cohortName, description: "Auto-created cohort for confirmed interns" })
          .select("id, whatsapp_group_link")
          .single();

        if (cohortError) {
          console.error("[applications-patch] cohort creation error:", cohortError);
        } else {
          cohortId = newCohort?.id || null;
          whatsappGroupLink = newCohort?.whatsapp_group_link || null;
        }
      }

      let tempPassword = "";
      let createdUserId = application.user_id;

      if (application.email) {
        tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        try {
          const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: application.email,
            password: tempPassword,
            email_confirm: true,
          });

          if (createError || !created?.user) {
            console.error("[applications-patch] auth create user error:", createError);
            const userId = application.user_id || "";
            if (userId) {
              const { data: updated } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: tempPassword,
              });
              createdUserId = updated.user?.id || userId;
            }
          } else {
            createdUserId = created.user.id;
          }
        } catch (err) {
          console.error("[applications-patch] auth user creation unexpected error:", err);
        }
      }

      if (createdUserId) {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: createdUserId,
            full_name: application.full_name,
            email: application.email,
            phone: application.phone,
            role: "intern",
            employment_type: "internship",
            status: "active",
          },
          { onConflict: "id" }
        );
      }

      if (cohortId && createdUserId) {
        await supabaseAdmin.from("intern_cohort_members").upsert(
          { cohort_id: cohortId, application_id: id, user_id: createdUserId },
          { onConflict: "application_id,cohort_id" }
        );
      }

      let message = `Hi ${application.full_name},\n\nCongratulations! Your internship application has been confirmed. We are excited to have you on board.\n\nYour login credentials:\nEmail: ${application.email}\nPassword: ${tempPassword}\n\nPlease login and change your password after first login.\n\nBest regards,\nLocawala Team`;

      if (whatsappGroupLink) {
        message += `\n\nJoin our WhatsApp group: ${whatsappGroupLink}`;
      }

      if (application.phone) {
        const token = process.env.WHATSAPP_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const cleanPhone = application.phone.replace(/[^\d]/g, "");

        if (token && phoneId) {
          try {
            await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
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
          } catch (err) {
            console.error("[applications-patch] whatsapp send error:", err);
          }
        }
      }

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      if (resendKey && application.email) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: application.email,
            subject: "Locawala - Internship Application Confirmed!",
            html: message.replace(/\n/g, "<br>"),
          });
        } catch (err) {
          console.error("[applications-patch] email send error:", err);
        }
      }
    }

    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
