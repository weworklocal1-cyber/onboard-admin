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
  const priority = url.searchParams.get("priority");
  const search = url.searchParams.get("search");

  try {
    let query = supabaseAdmin
      .from("feature_requests")
      .select(`
        *,
        tester:testers(id, full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (priority && priority !== "all") query = query.eq("priority", priority);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const transformed = (data || []).map(f => ({
      ...f,
      user_name: f?.tester?.full_name,
      user_email: f?.tester?.email,
    }));

    return NextResponse.json({ data: transformed || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 });
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
    const { title, description, priority, tester_id, business_value } = body as {
      title: string;
      description?: string;
      priority?: string;
      tester_id?: string;
      business_value?: string;
    };

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("feature_requests").insert({
      title,
      description,
      priority: priority || "medium",
      tester_id,
      business_value,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "add_feature_request",
      target_table: "feature_requests",
      target_id: data.id,
      details: { title, priority },
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
    const { status } = body as { status?: string };

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;

    const { error } = await supabaseAdmin.from("feature_requests").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "update_feature_request",
      target_table: "feature_requests",
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

    const { error } = await supabaseAdmin.from("feature_requests").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "delete_feature_request",
      target_table: "feature_requests",
      target_id: id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}