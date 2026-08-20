import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let webhookSecret: string | null = process.env.RAZORPAY_WEBHOOK_SECRET || null;

    if (!webhookSecret) {
      try {
        const { data: setting } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", "academy_razorpay_webhook_secret")
          .maybeSingle();
        webhookSecret = setting?.value || null;
      } catch {
        webhookSecret = null;
      }
    }

    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (generatedSignature !== signature) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload?.order || event.payload?.payment || {};

    const razorpayOrderId = payload.entity?.id;
    if (!razorpayOrderId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { data: order } = await supabaseAdmin
      .from("academy_orders")
      .select("id, user_id, course_id, status")
      .eq("gateway_order_id", razorpayOrderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (eventType === "payment.captured" && order.status !== "paid") {
      const paymentEntity = (event.payload?.payment?.entity || {}) as any;
      await supabaseAdmin
        .from("academy_orders")
        .update({
          status: "paid",
          gateway_payment_id: paymentEntity.id || null,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      const { data: existingEnrollment } = await supabaseAdmin
        .from("academy_enrollments")
        .select("id, status")
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .maybeSingle();

      if (!existingEnrollment || ["dropped", "pending"].includes((existingEnrollment as any).status)) {
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
      }
    } else if (eventType === "payment.failed" && order.status === "pending") {
      await supabaseAdmin
        .from("academy_orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", order.id);
    } else if (eventType === "refund.created" || eventType === "payment.refunded") {
      await supabaseAdmin
        .from("academy_orders")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      await supabaseAdmin
        .from("academy_enrollments")
        .update({ status: "dropped" })
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .eq("status", "active");
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("[webhook] error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
