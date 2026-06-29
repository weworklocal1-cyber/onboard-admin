import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("admin_users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { id: user.id, role: profile.role, full_name: profile.full_name };
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "founder" && sessionUser.role !== "super_admin" && sessionUser.role !== "hr_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const severity = url.searchParams.get("severity");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");

  try {
    let query = supabaseAdmin
      .from("bug_reports")
      .select(`
        *,
        tester:testers(id, full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (category && category !== "all") query = query.eq("category", category);
    if (severity && severity !== "all") query = query.eq("severity", severity);
    if (status && status !== "all") query = query.eq("status", status);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch bugs" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "founder" && sessionUser.role !== "super_admin" && sessionUser.role !== "hr_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();
    const body = await request.json();
    const { status, internal_notes, assigned_developer } = body as {
      status?: string;
      internal_notes?: string;
      assigned_developer?: string;
    };

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes;
    if (assigned_developer !== undefined) updateData.assigned_developer = assigned_developer;

    const { error } = await supabaseAdmin.from("bug_reports").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "update_bug",
      target_table: "bug_reports",
      target_id: id,
      details: updateData,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}