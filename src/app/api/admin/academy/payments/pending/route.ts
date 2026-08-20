import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: orders, error } = await supabaseAdmin
      .from("academy_orders")
      .select(`
        id,
        status,
        payment_method,
        upi_id,
        transaction_note,
        payment_proof_url,
        amount,
        currency,
        created_at,
        user_id,
        course_id,
        academy_courses ( id, title, slug )
      `)
      .eq("status", "pending_verification")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const items = (orders || []).map((order: any) => {
      const course = order.academy_courses;
      return {
        id: order.id,
        status: order.status,
        paymentMethod: order.payment_method,
        upiId: order.upi_id,
        transactionNote: order.transaction_note,
        proofUrl: order.payment_proof_url,
        amount: order.amount,
        currency: order.currency,
        createdAt: order.created_at,
        userId: order.user_id,
        courseId: order.course_id,
        courseTitle: course?.title ?? null,
        courseSlug: course?.slug ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to fetch pending payments" }, { status: 500 });
  }
}
