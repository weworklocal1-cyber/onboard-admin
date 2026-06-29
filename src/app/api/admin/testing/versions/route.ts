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
  const platform = url.searchParams.get("platform");
  const status = url.searchParams.get("status");

  try {
    let query = supabaseAdmin.from("testing_builds").select(`
      *,
      tester_count:testers(count),
      feedback_count:feedback(count)
    `).order("release_date", { ascending: false });

    if (platform && platform !== "all") query = query.eq("platform", platform);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const transformed = (data || []).map(v => ({
      id: v.id,
      version_name: v.version,
      version_code: v.build_number,
      platform: v.platform,
      release_date: v.release_date,
      status: v.status,
      release_notes: v.release_notes,
      file_url: v.play_store_url,
      tester_count: v.tester_count?.length || 0,
      feedback_count: v.feedback_count?.length || 0,
    }));

    return NextResponse.json({ data: transformed });
  } catch {
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "founder" && sessionUser.role !== "super_admin" && sessionUser.role !== "hr_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { version_name, version_code, platform, status, release_notes } = body as {
      version_name: string;
      version_code: number;
      platform: string;
      status?: string;
      release_notes?: string;
    };

    if (!version_name || !version_code) {
      return NextResponse.json({ error: "Version name and code are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("testing_builds").insert({
      version: version_name,
      build_number: String(version_code),
      platform,
      status: status || "draft",
      release_notes,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "add_version",
      target_table: "testing_builds",
      target_id: data.id,
      details: { version: version_name, platform },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
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
    const { version_name, version_code, status, release_notes } = body as {
      version_name?: string;
      version_code?: number;
      status?: string;
      release_notes?: string;
    };

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (version_name) updateData.version = version_name;
    if (version_code) updateData.build_number = String(version_code);
    if (status) updateData.status = status;
    if (release_notes !== undefined) updateData.release_notes = release_notes;

    const { error } = await supabaseAdmin.from("testing_builds").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "update_version",
      target_table: "testing_builds",
      target_id: id,
      details: updateData,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "founder" && sessionUser.role !== "super_admin" && sessionUser.role !== "hr_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    const { error } = await supabaseAdmin.from("testing_builds").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "delete_version",
      target_table: "testing_builds",
      target_id: id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}