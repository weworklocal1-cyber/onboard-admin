import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAcademyAuth(request);

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      order_id?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from("academy_orders")
      .select("id, user_id, course_id, amount, currency, status")
      .eq("gateway_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "paid") {
      const { data: enrollment } = await supabaseAdmin
        .from("academy_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", order.course_id)
        .in("status", ["active", "completed"])
        .maybeSingle();

      return NextResponse.json({
        success: true,
        already_enrolled: !!enrollment,
        enrollment_id: enrollment?.id,
        order_id: order.id,
      });
    }

    const now = new Date().toISOString();

    const { error: orderError } = await supabaseAdmin
      .from("academy_orders")
      .update({
        status: "paid",
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: razorpay_signature,
        paid_at: now,
        updated_at: now,
      })
      .eq("id", order.id);

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { data: existingEnrollment } = await supabaseAdmin
      .from("academy_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", order.course_id)
      .maybeSingle();

    let enrollmentId: string | null = null;

    if (!existingEnrollment) {
      const { data: enrollment } = await supabaseAdmin
        .from("academy_enrollments")
        .insert({
          user_id: user.id,
          course_id: order.course_id,
          status: "active",
          enrolled_at: now,
        })
        .select("id")
        .single();

      enrollmentId = enrollment?.id || null;
    } else if (existingEnrollment && ["dropped", "pending"].includes((existingEnrollment as any).status)) {
      const { data: enrollment } = await supabaseAdmin
        .from("academy_enrollments")
        .update({ status: "active", enrolled_at: now })
        .eq("id", existingEnrollment.id)
        .select("id")
        .single();

      enrollmentId = enrollment?.id || null;
    } else {
      enrollmentId = existingEnrollment.id;
    }

    return NextResponse.json({
      success: true,
      enrollment_id: enrollmentId,
      order_id: order.id,
      course_id: order.course_id,
    });
  } catch (e) {
    console.error("[verify-payment] error:", e);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
