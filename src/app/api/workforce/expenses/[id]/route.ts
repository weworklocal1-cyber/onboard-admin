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

// PATCH /api/workforce/expenses/[id]/approve
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: expense } = await supabaseAdmin
    .from("expenses")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (expense.status !== "pending") {
    return NextResponse.json({ error: `Expense is already ${expense.status}` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .update({
      status: "approved",
      approved_by: sessionUser.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select(`*, employee:profiles!expenses_employee_id_fkey(id, full_name, department, designation), approver:profiles!expenses_approved_by_fkey(id, full_name)`)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expense: data });
}

// POST /api/workforce/expenses/[id]/reject
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { rejection_reason } = body;

    const { data: expense } = await supabaseAdmin
      .from("expenses")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.status !== "pending") {
      return NextResponse.json({ error: `Expense is already ${expense.status}` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .update({
        status: "rejected",
        approved_by: sessionUser.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
      })
      .eq("id", params.id)
      .select(`*, employee:profiles!expenses_employee_id_fkey(id, full_name, department, designation), approver:profiles!expenses_approved_by_fkey(id, full_name)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: data });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
