import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attempt_id");
  if (!attemptId) return NextResponse.json({ error: "attempt_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("academy_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ answers: (data as any[]) || [] });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { attempt_id, question_id, selected_option, is_correct } = body as {
    attempt_id: string;
    question_id: string;
    selected_option: string;
    is_correct: boolean;
  };

  if (!attempt_id || !question_id || selected_option === undefined || selected_option === null) {
    return NextResponse.json({ error: "attempt_id, question_id, and selected_option are required" }, { status: 400 });
  }

  const upsertResult = await supabaseAdmin
    .from("academy_answers")
    .upsert({
      attempt_id,
      question_id,
      selected_option,
      is_correct: is_correct ?? false,
    }, { onConflict: ["attempt_id", "question_id"] } as any)
    .select("*");

  const answerData = (upsertResult as any).data;
  const answerError = (upsertResult as any).error;

  if (answerError) return NextResponse.json({ error: answerError.message }, { status: 500 });

  return NextResponse.json({ answer: answerData ? answerData[0] : null });
}
