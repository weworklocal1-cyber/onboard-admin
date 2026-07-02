import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: enrollments, error } = await supabaseAdmin
    .from("academy_enrollments")
    .select(`
      *,
      course:academy_courses!inner(id, title, slug, description, difficulty, duration_minutes, thumbnail_url)
    `)
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (enrollments || []).map((enrollment: any) => {
    const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
    return { ...enrollment, course };
  });

  return NextResponse.json({ enrollments: result });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { course_id } = body as { course_id: string };
  if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("academy_enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", course_id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") return NextResponse.json({ success: true, status: "already_enrolled" });
    if (existing.status === "dropped") {
      await supabaseAdmin.from("academy_enrollments").update({ status: "active", enrolled_at: new Date().toISOString() }).eq("id", existing.id);
      return NextResponse.json({ success: true, status: "reactivated" });
    }
  }

  const { data: enrollment, error } = await supabaseAdmin
    .from("academy_enrollments")
    .insert({ user_id: user.id, course_id, status: "active", enrolled_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, enrollment_id: enrollment.id, status: "enrolled" });
}
