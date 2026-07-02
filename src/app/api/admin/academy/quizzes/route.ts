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
  const { data, error } = await supabaseAdmin.from("academy_quizzes").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { module_id, title, passing_score, time_limit_minutes } = body as any;
    if (!module_id || !title) return NextResponse.json({ error: "module_id and title are required" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("academy_quizzes").insert([{ module_id, title, passing_score: passing_score ?? 70, time_limit_minutes: time_limit_minutes ?? 10 }]).select("*").single();
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
    const { id, title, passing_score, time_limit_minutes } = body as any;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (passing_score !== undefined) updates.passing_score = passing_score;
    if (time_limit_minutes !== undefined) updates.time_limit_minutes = time_limit_minutes;
    const { data, error } = await supabaseAdmin.from("academy_quizzes").update(updates).eq("id", id).select("*").single();
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
    const { error } = await supabaseAdmin.from("academy_quizzes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
