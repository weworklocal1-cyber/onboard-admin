import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from("academy_orders")
      .select(`
        id,
        course_id,
        amount,
        currency,
        status,
        payment_gateway,
        gateway_order_id,
        gateway_payment_id,
        created_at,
        paid_at,
        course:academy_courses!inner(title, slug)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (orders || []).map((order: any) => {
      const course = Array.isArray(order.course) ? order.course[0] : order.course;
      return {
        id: order.id,
        courseTitle: course?.title || 'Unknown Course',
        courseSlug: course?.slug || '',
        amount: order.amount || 0,
        currency: order.currency || 'INR',
        status: order.status || 'pending',
        paymentGateway: order.payment_gateway || 'razorpay',
        gatewayOrderId: order.gateway_order_id || '',
        gatewayPaymentId: order.gateway_payment_id || '',
        createdAt: order.created_at || '',
        paidAt: order.paid_at || null,
      };
    });

    return NextResponse.json({ orders: result });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
