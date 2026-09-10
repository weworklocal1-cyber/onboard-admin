import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("admin_users").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["founder", "super_admin", "hr_admin"].includes(profile.role)) return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const key = url.searchParams.get("key");

  try {
    let query = supabaseAdmin.from("message_templates").select("*").order("created_at", { ascending: true });
    if (category) query = query.eq("category", category);
    if (key) query = query.eq("key", key);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ templates: data || [] });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch templates", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { key, name, category, channel, subject, body: content, tags, is_active } = body as any;

    if (!key?.trim() || !name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "key, name and body are required" }, { status: 400 });
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const { data, error } = await supabaseAdmin
      .from("message_templates")
      .insert({
        key: cleanKey,
        name: name.trim(),
        category: category || "applicants",
        channel: channel || "whatsapp",
        subject: subject || null,
        body: content,
        tags: Array.isArray(tags) ? tags : [],
        is_active: is_active !== undefined ? !!is_active : true,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Template key already exists" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ template: data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create template", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, key, name, category, channel, subject, body: content, tags, is_active } = body as any;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updates: Record<string, any> = {};
    if (key !== undefined) updates.key = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category;
    if (channel !== undefined) updates.channel = channel;
    if (subject !== undefined) updates.subject = subject || null;
    if (content !== undefined) updates.body = content;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (is_active !== undefined) updates.is_active = !!is_active;

    const { data, error } = await supabaseAdmin
      .from("message_templates")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update template", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || (await request.json().catch(() => ({} as any))).id;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("message_templates").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete template", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
