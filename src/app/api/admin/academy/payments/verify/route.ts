import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendPaymentEmail } from "@/app/api/academy/payments/email";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("admin_users").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["founder", "super_admin", "hr_admin"].includes(profile.role)) return null;
    return true;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { orderId, action, note } = body as { orderId: string; action: "approve" | "reject"; note?: string };

    if (!orderId || !action) {
      return NextResponse.json({ error: "orderId and action are required" }, { status: 400 });
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("academy_orders")
      .select("id, user_id, course_id, status, amount, currency, payment_proof_url")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "approve") {
      const { error: updateError } = await supabaseAdmin
        .from("academy_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_note: note || null,
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      const { data: existingEnrollment } = await supabaseAdmin
        .from("academy_enrollments")
        .select("id, status")
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .maybeSingle();

      if (existingEnrollment) {
        await supabaseAdmin
          .from("academy_enrollments")
          .update({ status: "active", enrolled_at: new Date().toISOString() })
          .eq("id", existingEnrollment.id);
      } else {
        await supabaseAdmin.from("academy_enrollments").insert({
          user_id: order.user_id,
          course_id: order.course_id,
          status: "active",
          enrolled_at: new Date().toISOString(),
        });
      }

      const { data: course } = await supabaseAdmin
        .from("academy_courses")
        .select("title")
        .eq("id", order.course_id)
        .maybeSingle();

      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .maybeSingle();

      if (userProfile?.email) {
        await sendPaymentEmail({
          to: userProfile.email,
          subject: `Payment Approved - ${course?.title || "Course"}`,
          recipientName: userProfile.full_name,
          action: "approved",
          courseTitle: course?.title || "Unknown Course",
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        });
      }

      return NextResponse.json({ success: true, message: "Payment approved and user enrolled" });
    }

    if (action === "reject") {
      const { error: updateError } = await supabaseAdmin
        .from("academy_orders")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
          admin_note: note || null,
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      const { data: course } = await supabaseAdmin
        .from("academy_courses")
        .select("title")
        .eq("id", order.course_id)
        .maybeSingle();

      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .maybeSingle();

      if (userProfile?.email) {
        await sendPaymentEmail({
          to: userProfile.email,
          subject: `Payment Rejected - ${course?.title || "Course"}`,
          recipientName: userProfile.full_name,
          action: "rejected",
          courseTitle: course?.title || "Unknown Course",
          orderId: order.id,
          adminNote: note || undefined,
        });
      }

      return NextResponse.json({ success: true, message: "Payment proof rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process verification" }, { status: 500 });
  }
}
