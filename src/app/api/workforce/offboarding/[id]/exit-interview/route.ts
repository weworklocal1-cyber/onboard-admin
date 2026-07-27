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

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("exit_interviews")
    .select("*")
    .eq("employee_offboarding_id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interview: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { reason_for_leaving, liked_most, liked_least, suggestions, would_recommend, notes, interview_date } = body;

    const { data: existing } = await supabaseAdmin
      .from("exit_interviews")
      .select("id")
      .eq("employee_offboarding_id", params.id)
      .maybeSingle();

    let data, error;
    if (existing) {
      ({ data, error } = await supabaseAdmin
        .from("exit_interviews")
        .update({
          reason_for_leaving,
          liked_most,
          liked_least,
          suggestions,
          would_recommend,
          notes,
          interview_date,
          conducted_by: sessionUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single());
    } else {
      ({ data, error } = await supabaseAdmin
        .from("exit_interviews")
        .insert({
          employee_offboarding_id: params.id,
          reason_for_leaving,
          liked_most,
          liked_least,
          suggestions,
          would_recommend,
          notes,
          interview_date,
          conducted_by: sessionUser.id,
        })
        .select("*")
        .single());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ interview: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
