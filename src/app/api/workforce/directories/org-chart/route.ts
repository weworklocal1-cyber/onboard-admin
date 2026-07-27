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

function canRead(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canRead(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rootId = searchParams.get("root_id");

  const query = supabaseAdmin
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
    .eq("status", "active")
    .order("full_name");

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (rootId) {
    const root = data?.find((p: any) => p.id === rootId);
    return NextResponse.json({
      root: root ? { ...root, children: buildSubtree(root.id, data || []) } : null,
    });
  }

  const roots = data?.filter((p: any) => !p.reporting_manager_id) || [];
  const tree = roots.map((root: any) => ({
    ...root,
    children: buildSubtree(root.id, data || []),
  }));

  return NextResponse.json({ tree });
}

function buildSubtree(parentId: string, employees: any[]): any[] {
  const children = employees.filter((p) => p.reporting_manager_id === parentId);
  return children.map((child) => ({
    ...child,
    children: buildSubtree(child.id, employees),
  }));
}
