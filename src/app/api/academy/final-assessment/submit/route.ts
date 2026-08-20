import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAcademyAuth(request);

  const body = await request.json();
  const { attempt_id, answers } = body as {
    attempt_id: string;
    answers: Record<string, string>;
  };

  if (!attempt_id || !answers) {
    return NextResponse.json({ error: "attempt_id and answers are required" }, { status: 400 });
  }

  const { data: attempt } = await supabaseAdmin
    .from("academy_attempts")
    .select("id, user_id, course_id")
    .eq("id", attempt_id)
    .eq("user_id", user.id)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const questionIds = Object.keys(answers);
  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 });
  }

  const { data: questions } = await supabaseAdmin
    .from("academy_questions")
    .select("id, correct_option")
    .in("id", questionIds);

  const correctMap = new Map((questions || []).map((q: any) => [q.id, q.correct_option]));

  let correct = 0;
  const answerRecords: any[] = [];

  for (const [questionId, selectedOption] of Object.entries(answers)) {
    const correctOption = correctMap.get(questionId);
    const isCorrect = !!correctOption && selectedOption === correctOption;
    if (isCorrect) correct++;
    answerRecords.push({
      attempt_id,
      question_id: questionId,
      selected_option: selectedOption || "",
      is_correct: isCorrect,
    });
  }

  if (answerRecords.length > 0) {
    await supabaseAdmin.from("academy_answers").upsert(
      answerRecords.map((a) => ({ ...a, attempt_id, question_id: a.question_id })),
      { onConflict: ["attempt_id", "question_id"] } as any
    );
  }

  const total = questionIds.length;
  const percentage = Math.round((correct / total) * 100);

  const { data: course } = await supabaseAdmin
    .from("academy_courses")
    .select("passing_score")
    .eq("id", attempt.course_id)
    .single();

  const passingScore = course?.passing_score ?? 68;
  const passed = percentage >= passingScore;

  const { error: updateError } = await supabaseAdmin
    .from("academy_attempts")
    .update({
      score: correct,
      percentage,
      passed,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attempt_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    score: correct,
    total,
    percentage,
    passed,
    passing_score: passingScore,
  });
}
