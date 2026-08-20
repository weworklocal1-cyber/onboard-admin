import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const user = await requireAcademyAuth(request);

  const { data: quiz } = await supabaseAdmin
    .from("academy_quizzes")
    .select("id, module_id, title, passing_score, time_limit_minutes")
    .eq("id", params.quizId)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { data: module } = await supabaseAdmin
    .from("academy_modules")
    .select("course_id")
    .eq("id", quiz.module_id)
    .single();

  if (!module) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const { data: enrollment } = await supabaseAdmin
    .from("academy_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", module.course_id)
    .in("status", ["active", "completed"])
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment required to access quiz" }, { status: 403 });
  }

  const { data: questions, error } = await supabaseAdmin
    .from("academy_questions")
    .select("id, question, option_a, option_b, option_c, option_d, difficulty, category, tags")
    .eq("quiz_id", params.quizId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      passing_score: quiz.passing_score,
      time_limit_minutes: quiz.time_limit_minutes,
    },
    questions: (questions || []).map((q: any) => ({
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
