import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const user = await requireAcademyAuth(request);

  const { data: course } = await supabaseAdmin
    .from("academy_courses")
    .select("id, passing_score")
    .eq("slug", params.slug)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { data: enrollment } = await supabaseAdmin
    .from("academy_enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();

  if (!enrollment || enrollment.status === "dropped") {
    return NextResponse.json({ error: "Enrollment required" }, { status: 403 });
  }

  const { data: modulesData } = await supabaseAdmin
    .from("academy_modules")
    .select("id")
    .eq("course_id", course.id);

  const moduleIds = (modulesData || []).map((m: any) => m.id);

  const { data: lessonsData } = await supabaseAdmin
    .from("academy_lessons")
    .select("id")
    .in("module_id", moduleIds);

  const allLessonIds = (lessonsData || []).map((l: any) => l.id);

  if (allLessonIds.length === 0) {
    return NextResponse.json({ error: "Course has no lessons" }, { status: 400 });
  }

  const { data: progressData } = await supabaseAdmin
    .from("academy_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id)
    .in("lesson_id", allLessonIds);

  const completedLessonIds = new Set((progressData || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id));
  const incompleteLessons = allLessonIds.filter((id: string) => !completedLessonIds.has(id));

  if (incompleteLessons.length > 0) {
    return NextResponse.json(
      { error: `Complete all ${allLessonIds.length} lessons first. ${incompleteLessons.length} remaining.`, locked: true },
      { status: 403 }
    );
  }

  const { data: quizzesData } = await supabaseAdmin
    .from("academy_quizzes")
    .select("id")
    .in("module_id", moduleIds);

  const quizIds = (quizzesData || []).map((q: any) => q.id);

  if (quizIds.length === 0) {
    return NextResponse.json({ error: "No quizzes available for this course" }, { status: 404 });
  }

  const { data: questionsData } = await supabaseAdmin
    .from("academy_questions")
    .select("id, question, option_a, option_b, option_c, option_d, difficulty, category, tags")
    .in("quiz_id", quizIds);

  const allQuestions = (questionsData || []) as any[];
  const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 30);

  const { data: attempt } = await supabaseAdmin
    .from("academy_attempts")
    .insert({
      user_id: user.id,
      course_id: course.id,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return NextResponse.json({
    attempt_id: attempt?.id,
    passing_score: course.passing_score ?? 68,
    questions: shuffled.map((q) => ({
      id: q.id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      difficulty: q.difficulty,
      category: q.category,
      tags: q.tags,
    })),
  });
}
