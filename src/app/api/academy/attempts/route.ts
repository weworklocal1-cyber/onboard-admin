import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAcademyAuth(request);

  const body = await request.json();
  const { quiz_id, course_id, started_at } = body as {
    quiz_id?: string;
    course_id?: string;
    started_at?: string;
  };

  if (!quiz_id && !course_id) {
    return NextResponse.json({ error: "quiz_id or course_id required" }, { status: 400 });
  }

  const { data: attempt, error } = await supabaseAdmin
    .from("academy_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quiz_id ?? null,
      course_id: course_id ?? null,
      started_at: started_at || new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: attempt.id });
}
