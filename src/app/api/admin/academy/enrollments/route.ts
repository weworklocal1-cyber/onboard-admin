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
    const { data, error } = await supabaseAdmin
      .from("academy_enrollments")
      .select(`
        id,
        user_id,
        course_id,
        status,
        enrolled_at,
        completed_at,
        profiles:profiles!inner(full_name, email),
        academy_courses:academy_courses!inner(title, slug, is_free, price, currency),
        academy_orders:academy_orders!left(status, amount, currency, paid_at, gateway_payment_id)
      `)
      .order("enrolled_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: "Server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
