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
  const { data, error } = await supabaseAdmin.from("academy_modules").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { course_id, title, order_no } = body as { course_id: string; title: string; order_no?: number };
    if (!course_id || !title) return NextResponse.json({ error: "course_id and title are required" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("academy_modules").insert([{ course_id, title, order_no: order_no ?? 0 }]).select("*").single();
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
    const { id, title, order_no } = body as { id: string; title?: string; order_no?: number };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (order_no !== undefined) updates.order_no = order_no;
    const { data, error } = await supabaseAdmin.from("academy_modules").update(updates).eq("id", id).select("*").single();
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
    const { error } = await supabaseAdmin.from("academy_modules").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
