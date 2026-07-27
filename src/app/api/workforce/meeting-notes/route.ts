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

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const type = searchParams.get("type");

  let query = supabaseAdmin
    .from("meeting_notes")
    .select(`*, creator:profiles!created_by(id, full_name), participants:meeting_note_participants(employee:profiles!employee_id(id, full_name, department))`)
    .order("meeting_date", { ascending: false });

  if (startDate) query = query.gte("meeting_date", startDate);
  if (endDate) query = query.lte("meeting_date", endDate);
  if (type) query = query.eq("meeting_type", type);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data || [] });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || !canWrite(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, meeting_date, meeting_type, participant_ids } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("meeting_notes")
      .insert({
        title: title.trim(),
        content: content?.trim() || null,
        meeting_date: meeting_date || new Date().toISOString().split('T')[0],
        meeting_type: meeting_type || "standup",
        created_by: sessionUser.id,
      })
      .select(`*, creator:profiles!created_by(id, full_name)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (participant_ids && Array.isArray(participant_ids) && participant_ids.length > 0) {
      const participants = participant_ids.map((employee_id: string) => ({
        meeting_note_id: data.id,
        employee_id,
      }));

      await supabaseAdmin.from("meeting_note_participants").insert(participants);
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
