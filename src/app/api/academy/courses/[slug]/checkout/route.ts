import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireAcademyAuth(request);

    const { data: course } = await supabaseAdmin
      .from("academy_courses")
      .select("id, title, slug, is_free, price, currency")
      .eq("slug", params.slug)
      .single();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.is_free || (course.price ?? 0) <= 0) {
      return NextResponse.json({ error: "This course is free. Please use the enrollment flow." }, { status: 400 });
    }

    const { data: existingOrder } = await supabaseAdmin
      .from("academy_orders")
      .select("id, status, gateway_order_id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingOrder?.gateway_order_id) {
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      return NextResponse.json({
        order_id: existingOrder.gateway_order_id,
        amount: course.price,
        currency: course.currency,
        key_id: razorpayKeyId,
        course: { id: course.id, title: course.title, slug: course.slug },
      });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const amountInPaise = Math.round(Number(course.price) * 100);
    const receipt = `order_${course.id.substring(0, 8)}_${user.id.substring(0, 8)}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: course.currency || "INR",
      receipt,
      payment_capture: 1,
      notes: {
        course_id: course.id,
        user_id: user.id,
        course_slug: course.slug,
      },
    });

    const { data: orderRecord } = await supabaseAdmin
      .from("academy_orders")
      .upsert(
        {
          user_id: user.id,
          course_id: course.id,
          amount: course.price,
          currency: course.currency,
          status: "pending",
          gateway_order_id: order.id,
          payment_gateway: "razorpay",
          metadata: { receipt, razorpay_receipt: order.receipt },
        },
        { onConflict: ["user_id", "course_id"], ignoreDuplicates: false } as any
      )
      .select("id")
      .single();

    const { data: gstSettings } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", ["academy_gst_rate", "academy_gst_enabled", "academy_gst_inclusive"]);

    const gstSettingsMap: Record<string, string> = {};
    (gstSettings || []).forEach((row: any) => {
      gstSettingsMap[row.key] = row.value;
    });

    return NextResponse.json({
      order_id: order.id,
      amount: course.price,
      currency: course.currency,
      key_id: razorpayKeyId,
      course: { id: course.id, title: course.title, slug: course.slug },
      order_record_id: orderRecord?.id,
      gst: gstSettingsMap,
    });
  } catch (e) {
    console.error("[checkout] error:", e);
    return NextResponse.json({ error: "Failed to initialize checkout" }, { status: 500 });
  }
}
