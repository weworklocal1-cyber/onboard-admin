import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    let userId: string | null = null;

    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
      if (user) userId = user.id;
    }

    let enrollmentQuery = supabaseAdmin
      .from("academy_enrollments")
      .select("course_id, status");

    if (userId) {
      enrollmentQuery = enrollmentQuery.eq("user_id", userId);
    } else {
      enrollmentQuery = enrollmentQuery.eq("user_id", "00000000-0000-0000-0000-000000000000");
    }

    const { data: enrollments } = await enrollmentQuery;
    const enrolledCourseIds = new Set((enrollments || []).map((e: any) => e.course_id));

    const { data: courses, error } = await supabaseAdmin
      .from("academy_courses")
      .select("id, title, slug, description, thumbnail_url, duration_minutes, difficulty, passing_score, is_free, price, currency, instructor_name, what_you_will_learn, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (courses || []).map((course: any) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      duration_minutes: course.duration_minutes,
      difficulty: course.difficulty,
      passing_score: course.passing_score,
      is_free: course.is_free ?? true,
      price: course.price ?? 0,
      currency: course.currency || "INR",
      instructor_name: course.instructor_name,
      what_you_will_learn: course.what_you_will_learn || [],
      enrolled: enrolledCourseIds.has(course.id),
    }));

    return NextResponse.json({ courses: result });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
