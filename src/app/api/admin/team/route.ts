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
  if (sessionUser.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.id);
      return { ...row, email: authUser?.user?.email ?? null };
    })
  );

  return NextResponse.json({ data: rows });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { email, full_name, role, password } = body as {
      email: string; full_name: string; role: string; password?: string;
    };

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: "Email, name and role are required" }, { status: 400 });
    }
    if (!["super_admin", "admin", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const pwd = password || Math.random().toString(36).slice(-8);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || "Failed to create user" }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin
      .from("admin_users")
      .insert({ id: created.user.id, full_name, role });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    await supabaseAdmin.from("admin_activity_log").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "add_member",
      target_table: "admin_users",
      target_id: created.user.id,
      details: { added_email: email, added_name: full_name, added_role: role },
    });

    return NextResponse.json({
      success: true,
      user: { id: created.user.id, email: created.user.email, full_name, role },
      temp_password: password ? undefined : pwd,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { id } = body as { id: string };

    if (id === sessionUser.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("admin_users").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("admin_activity_log").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "remove_member",
      target_table: "admin_users",
      target_id: id,
      details: {},
    });

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { id, role, full_name } = body as { id: string; role?: string; full_name?: string };

    if (id === sessionUser.id && role && role !== "super_admin") {
      return NextResponse.json({ error: "Cannot change your own super_admin role" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (role) updateData.role = role;
    if (full_name) updateData.full_name = full_name;

    const { error } = await supabaseAdmin.from("admin_users").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("admin_activity_log").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "update_role",
      target_table: "admin_users",
      target_id: id,
      details: { new_role: role, new_name: full_name },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
