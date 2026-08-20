import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    let userId: string | null = null;

    if (authHeader) {
      try {
        const authResult = await requireAcademyAuth(request);
        userId = authResult.userId;
      } catch {
        userId = null;
      }
    }

    const { data: courseData, error: courseError } = await supabaseAdmin
      .from("academy_courses")
      .select("id, title, slug, description, thumbnail_url, duration_minutes, difficulty, passing_score, is_published, is_free, price, currency, instructor_name, what_you_will_learn, created_at")
      .eq("slug", params.slug)
      .single();

    if (courseError || !courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: modulesData, error: modulesError } = await supabaseAdmin
      .from("academy_modules")
      .select(`
        *,
        lessons:academy_lessons(*),
        quiz:academy_quizzes(id, title, passing_score)
      `)
      .eq("course_id", courseData.id)
      .order("order_no", { ascending: true });

    if (modulesError) {
      return NextResponse.json({ error: modulesError.message }, { status: 500 });
    }

    let enrolled = false;
    let enrollmentStatus: string | null = null;

    if (userId) {
      const { data: enrollmentData } = await supabaseAdmin
        .from("academy_enrollments")
        .select("status")
        .eq("user_id", userId)
        .eq("course_id", courseData.id)
        .maybeSingle();

      if (enrollmentData) {
        enrolled = true;
        enrollmentStatus = enrollmentData.status;
      }
    }

    const course = {
      id: courseData.id,
      title: courseData.title,
      slug: courseData.slug,
      description: courseData.description,
      thumbnail_url: courseData.thumbnail_url,
      duration_minutes: courseData.duration_minutes,
      difficulty: courseData.difficulty,
      passing_score: courseData.passing_score,
      is_published: courseData.is_published,
      is_free: courseData.is_free ?? true,
      price: courseData.price ?? 0,
      currency: courseData.currency || "INR",
      instructor_name: courseData.instructor_name,
      what_you_will_learn: courseData.what_you_will_learn || [],
      enrolled,
      enrollment_status: enrollmentStatus,
    };

    const modules = (modulesData || []).map((module: any) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      order_no: module.order_no,
      course_id: module.course_id,
      lessons: (module.lessons || []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        content_md: lesson.content_md ?? '',
        video_url: lesson.video_url ?? '',
        duration_minutes: lesson.duration_minutes,
        order_no: lesson.order_no,
        module_id: lesson.module_id,
        is_published: lesson.is_published,
      })),
      quiz: module.quiz
        ? {
            id: module.quiz.id,
            title: module.quiz.title,
            passing_score: module.quiz.passing_score,
          }
        : null,
    }));

    return NextResponse.json({ course, modules });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
