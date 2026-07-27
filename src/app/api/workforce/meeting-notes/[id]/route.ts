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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from("meeting_notes")
    .select(`*, creator:profiles!created_by(id, full_name), participants:meeting_note_participants(employee:profiles!employee_id(id, full_name, department))`)
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Meeting note not found" }, { status: 404 });
  }

  return NextResponse.json({ note: data });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || !canWrite(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, meeting_date, meeting_type, participant_ids } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title?.trim();
    if (content !== undefined) updates.content = content?.trim() || null;
    if (meeting_date !== undefined) updates.meeting_date = meeting_date;
    if (meeting_type !== undefined) updates.meeting_type = meeting_type;

    const { data, error } = await supabaseAdmin
      .from("meeting_notes")
      .update(updates)
      .eq("id", params.id)
      .select(`*, creator:profiles!created_by(id, full_name)`)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Meeting note not found" }, { status: 404 });
    }

    if (participant_ids !== undefined && Array.isArray(participant_ids)) {
      await supabaseAdmin.from("meeting_note_participants").delete().eq("meeting_note_id", params.id);

      if (participant_ids.length > 0) {
        const participants = participant_ids.map((employee_id: string) => ({
          meeting_note_id: params.id,
          employee_id,
        }));
        await supabaseAdmin.from("meeting_note_participants").insert(participants);
      }
    }

    return NextResponse.json({ note: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || !canWrite(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabaseAdmin.from("meeting_notes").delete().eq("id", params.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
