import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

function isFounderOrAdmin(role: string) {
  return ['founder', 'super_admin', 'hr_admin'].includes(role);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { flag_id, status, review_notes } = body;

    if (!flag_id || !status) {
      return NextResponse.json({ error: "flag_id and status are required" }, { status: 400 });
    }

    const validStatuses = ['dismissed', 'converted_to_pip', 'escalated'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const updateData: any = {
      status,
      review_notes: review_notes || null,
      reviewed_by: sessionUser.id,
      reviewed_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("pip_auto_flags")
      .update(updateData)
      .eq("id", flag_id)
      .select("*")
      .single();

    if (error) throw error;

    if (status === 'converted_to_pip') {
      const { data: flag, error: flagError } = await supabaseAdmin
        .from("pip_auto_flags")
        .select("*")
        .eq("id", flag_id)
        .single();

      if (!flagError && flag) {
        await supabaseAdmin.from("performance_improvement_plans").insert({
          employee_id: flag.employee_id,
          created_by: sessionUser.id,
          title: `PIP: ${flag.rule_name}`,
          description: `Auto-generated PIP based on criteria: ${flag.description}${review_notes ? `\n\nReview notes: ${review_notes}` : ''}`,
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: 'active',
          outcome: 'in_progress',
        });
      }
    }

    return NextResponse.json({ flag: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update flag" }, { status: 500 });
  }
}
