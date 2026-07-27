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
  return ['founder', 'super_admin', 'hr_admin', 'team_lead', 'employee'].includes(role);
}

function canWrite(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

const EXPENSE_CATEGORIES = [
  'travel',
  'meals',
  'accommodation',
  'office_supplies',
  'equipment',
  'training',
  'marketing',
  'utilities',
  'other',
];

// GET /api/workforce/expenses
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canRead(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("expenses")
    .select(`*, employee:profiles!expenses_employee_id_fkey(id, full_name, department, designation), approver:profiles!expenses_approved_by_fkey(id, full_name)`)
    .order("expense_date", { ascending: false });

  if (!canWrite(sessionUser.role)) {
    query = query.eq("employee_id", sessionUser.id);
  } else if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: data || [] });
}

// POST /api/workforce/expenses
export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canRead(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, amount, category, expense_date, receipt_url, employee_id } = body;

    if (!title || !amount || !expense_date) {
      return NextResponse.json({ error: "Title, amount, and expense date are required" }, { status: 400 });
    }

    const targetEmployeeId = employee_id || sessionUser.id;
    const isAdmin = canWrite(sessionUser.role);

    if (!isAdmin && targetEmployeeId !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert({
        employee_id: targetEmployeeId,
        title: title.trim(),
        description: description?.trim() || null,
        amount: Number(amount),
        category: category || "other",
        expense_date,
        receipt_url: receipt_url || null,
        status: "pending",
      })
      .select(`*, employee:profiles!expenses_employee_id_fkey(id, full_name, department, designation)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
