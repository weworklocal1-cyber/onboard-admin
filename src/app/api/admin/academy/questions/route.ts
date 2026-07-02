import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("admin_users").select("role").eq("id", user.id).single();
  if (!profile || !["founder", "super_admin", "hr_admin"].includes(profile.role)) return null;
  return true;
}

export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("academy_questions").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { quiz_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, category, tags } = body as any;
    if (!quiz_id || !question || !option_a || !option_b || !option_c || !option_d || !correct_option) return NextResponse.json({ error: "quiz_id, question, options and correct_option are required" }, { status: 400 });
    if (!["a", "b", "c", "d"].includes(correct_option)) return NextResponse.json({ error: "correct_option must be a, b, c, or d" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("academy_questions").insert([{ quiz_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, category, tags }]).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, category, tags } = body as any;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const updates: Record<string, any> = {};
    if (question !== undefined) updates.question = question;
    if (option_a !== undefined) updates.option_a = option_a;
    if (option_b !== undefined) updates.option_b = option_b;
    if (option_c !== undefined) updates.option_c = option_c;
    if (option_d !== undefined) updates.option_d = option_d;
    if (correct_option !== undefined) { if (!["a", "b", "c", "d"].includes(correct_option)) return NextResponse.json({ error: "correct_option must be a, b, c, or d" }, { status: 400 }); updates.correct_option = correct_option; }
    if (explanation !== undefined) updates.explanation = explanation;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    const { data, error } = await supabaseAdmin.from("academy_questions").update(updates).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = (await request.json()) as { id: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { error } = await supabaseAdmin.from("academy_questions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
