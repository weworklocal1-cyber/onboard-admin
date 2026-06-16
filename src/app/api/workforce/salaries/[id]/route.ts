import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

const ADMIN_ROLES = ["founder", "super_admin", "hr_admin"];

// GET /api/workforce/salaries/[id]
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("salaries")
    .select(`*, employee:profiles!salaries_employee_id_fkey(id, full_name, designation, department)`)
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const isAdmin = ADMIN_ROLES.includes(sessionUser.role);
  if (!isAdmin && data.employee_id !== sessionUser.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ salary: data });
}

// PATCH /api/workforce/salaries/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(sessionUser.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const allowed = [
    "gross_salary", "base_salary", "hra", "special_allowance", "performance_bonus",
    "travel_allowance", "medical_allowance", "other_allowances",
    "pf_employee", "pf_employer", "professional_tax", "tds", "other_deductions",
    "net_salary", "payment_frequency", "effective_from", "effective_to",
    "status", "perks", "notes",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key] === "" ? null : body[key];
    }
  }

  const { data, error } = await supabaseAdmin
    .from("salaries")
    .update(updates)
    .eq("id", params.id)
    .select(`*, employee:profiles!salaries_employee_id_fkey(id, full_name, designation, department)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ salary: data });
}

// DELETE /api/workforce/salaries/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(sessionUser.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabaseAdmin
    .from("salaries")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
