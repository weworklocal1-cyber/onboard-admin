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
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");

  try {
    let query = supabaseAdmin.from("testers").select(`
      *,
      feedback:feedback(count),
      bugs:bug_reports(count)
    `).order("invited_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const transformed = (data || []).map(t => ({
      id: t.id,
      email: t.email,
      full_name: t.full_name,
      phone: t.phone,
      status: t.status,
      assigned_version: t.assigned_version,
      joined_at: t.invited_at,
      last_login: t.last_login,
      feedback_count: t.feedback?.length || 0,
      bugs_reported: t.bugs?.length || 0,
    }));

    return NextResponse.json({ data: transformed });
  } catch {
    return NextResponse.json({ error: "Failed to fetch testers" }, { status: 500 });
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
    const { status } = body as { status?: string };

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;

    const { error } = await supabaseAdmin.from("testers").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "update_tester",
      target_table: "testers",
      target_id: id,
      details: updateData,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}