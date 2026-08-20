import { supabaseAdmin } from "@/lib/supabase";

type User = { id: string; email?: string };

export async function requireAcademyAuth(request: Request): Promise<User> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new NextResponseJsonError("Unauthorized", 401);
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    throw new NextResponseJsonError("Unauthorized", 401);
  }

  return { id: user.id, email: user.email ?? undefined };
}

export async function requireCourseAccess(
  request: Request,
  courseSlug: string
): Promise<{ userId: string; courseId: string; isEnrolled: boolean; isFree: boolean; price: number }> {
  const user = await requireAcademyAuth(request);

  const { data: course, error: courseError } = await supabaseAdmin
    .from("academy_courses")
    .select("id, is_free, price")
    .eq("slug", courseSlug)
    .single();

  if (courseError || !course) {
    throw new NextResponseJsonError("Course not found", 404);
  }

  const { data: enrollment } = await supabaseAdmin
    .from("academy_enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .in("status", ["active", "completed"])
    .maybeSingle();

  const isEnrolled = !!enrollment;

  if (!course.is_free && !isEnrolled) {
    throw new NextResponseJsonError("Payment required to access this course", 402);
  }

  return {
    userId: user.id,
    courseId: course.id,
    isEnrolled,
    isFree: course.is_free ?? true,
    price: course.price ?? 0,
  };
}

export async function requireActiveEnrollment(
  request: Request,
  courseId: string
): Promise<string> {
  const user = await requireAcademyAuth(request);

  const { data: enrollment } = await supabaseAdmin
    .from("academy_enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .in("status", ["active", "completed"])
    .maybeSingle();

  if (!enrollment) {
    throw new NextResponseJsonError("Active enrollment required", 403);
  }

  return user.id;
}

export async function requireLessonOwnership(
  userId: string,
  lessonId: string
): Promise<boolean> {
  const { data: lesson } = await supabaseAdmin
    .from("academy_lessons")
    .select("module_id")
    .eq("id", lessonId)
    .single();

  if (!lesson) return false;

  const { data: module } = await supabaseAdmin
    .from("academy_modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .single();

  if (!module) return false;

  const { data: enrollment } = await supabaseAdmin
    .from("academy_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", module.course_id)
    .in("status", ["active", "completed"])
    .maybeSingle();

  return !!enrollment;
}

class NextResponseJsonError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
  }
}
