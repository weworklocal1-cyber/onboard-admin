import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
    return profile;
  } catch {
    return null;
  }
}

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

const ALLOWED_STATUSES = new Set(['present', 'absent', 'late', 'half_day', 'wfh', 'on_leave']);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status, reason } = body;

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${[...ALLOWED_STATUSES].join(', ')}` }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("attendance")
      .update({
        status,
        override_by: sessionUser.id,
        override_reason: reason || null,
        override_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;

    await logAudit(
      "attendance_override",
      "attendance",
      params.id,
      { status: existing.status },
      { status, override_by: sessionUser.id, override_reason: reason || null },
      sessionUser.id
    );

    return NextResponse.json({ record: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to override attendance" }, { status: 500 });
  }
}
