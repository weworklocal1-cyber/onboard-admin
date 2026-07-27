import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

function canWrite(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

// PATCH /api/workforce/assets/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowed = [
      "name",
      "asset_type",
      "description",
      "serial_number",
      "purchase_date",
      "purchase_price",
      "current_value",
      "condition_status",
      "assigned_to",
      "location",
      "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key] === "" ? null : body[key];
      }
    }

    if (updates.assigned_to && updates.assigned_to !== null) {
      updates.assigned_at = new Date().toISOString();
      updates.status = updates.status || "assigned";
    } else if (updates.assigned_to === null) {
      updates.assigned_at = null;
      updates.status = "available";
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .update(updates)
      .eq("id", params.id)
      .select(`*, assignee:profiles!assets_assigned_to_fkey(id, full_name, department, designation)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

// DELETE /api/workforce/assets/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("assets")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
