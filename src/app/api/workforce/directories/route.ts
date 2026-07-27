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

function canRead(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canRead(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: employees, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        designation,
        department,
        employment_type,
        status,
        phone,
        work_location,
        reporting_manager_id
      `)
      .order("full_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const managerIds = Array.from(
      new Set((employees || []).map((e: any) => e.reporting_manager_id).filter(Boolean))
    );

    const managerMap = new Map<string, { full_name: string; designation: string | null }>();
    if (managerIds.length > 0) {
      const { data: managers } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, designation")
        .in("id", managerIds);

      (managers || []).forEach((m: any) => managerMap.set(m.id, { full_name: m.full_name, designation: m.designation }));
    }

    const enriched = (employees || []).map((e: any) => ({
      ...e,
      manager: e.reporting_manager_id ? managerMap.get(e.reporting_manager_id) || null : null,
    }));

    return NextResponse.json({ employees: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
