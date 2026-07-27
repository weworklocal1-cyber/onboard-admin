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

// PATCH /api/workforce/performance-reviews/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowed = [
      "rating",
      "strengths",
      "areas_for_improvement",
      "goals",
      "overall_comments",
      "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key] === "" ? null : body[key];
      }
    }

    if (updates.status === "submitted" && !updates.submitted_at) {
      updates.submitted_at = new Date().toISOString();
    }

    if (updates.rating && (Number(updates.rating) < 1 || Number(updates.rating) > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("performance_reviews")
      .update(updates)
      .eq("id", params.id)
      .select(`*, employee:profiles!performance_reviews_employee_id_fkey(id, full_name, department, designation), reviewer:profiles!performance_reviews_reviewer_id_fkey(id, full_name)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ review: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

// DELETE /api/workforce/performance-reviews/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("performance_reviews")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
