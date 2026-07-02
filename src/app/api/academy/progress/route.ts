import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lesson_id, course_id, completed } = body as { lesson_id: string; course_id: string; completed?: boolean };

  if (!lesson_id || !course_id) {
    return NextResponse.json({ error: "lesson_id and course_id required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("academy_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson_id)
    .maybeSingle();

  const isComplete = completed !== false;

  if (existing) {
    const { error } = await supabaseAdmin
      .from("academy_progress")
      .update({ completed: isComplete, completed_at: isComplete ? new Date().toISOString() : null, course_id })
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "updated" });
  }

  const { error } = await supabaseAdmin
    .from("academy_progress")
    .insert({ user_id: user.id, lesson_id, course_id, completed: isComplete, completed_at: isComplete ? new Date().toISOString() : null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: "created" });
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = new URL(request.url).searchParams.get("course_id");
  let query = supabaseAdmin.from("academy_progress").select("lesson_id, completed, completed_at").eq("user_id", user.id);
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ progress: data || [] });
}
