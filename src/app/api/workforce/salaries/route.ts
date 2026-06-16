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

// GET /api/workforce/salaries?employee_id=xxx
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  // Employees can only see their own salary
  const isAdmin = ADMIN_ROLES.includes(sessionUser.role);
  if (!isAdmin && employeeId !== sessionUser.id && !employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("salaries")
    .select(`*, employee:profiles!salaries_employee_id_fkey(id, full_name, designation, department)`)
    .order("effective_from", { ascending: false });

  if (!isAdmin) {
    // Non-admin can only see their own
    query = query.eq("employee_id", sessionUser.id);
  } else if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ salaries: data || [] });
}

// POST /api/workforce/salaries
export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(sessionUser.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const {
    employee_id, gross_salary, base_salary, hra, special_allowance,
    performance_bonus, travel_allowance, medical_allowance, other_allowances,
    pf_employee, pf_employer, professional_tax, tds, other_deductions,
    net_salary, payment_frequency, effective_from, effective_to, perks, notes,
  } = body;

  if (!employee_id || !gross_salary || !effective_from) {
    return NextResponse.json(
      { error: "employee_id, gross_salary, and effective_from are required" },
      { status: 400 }
    );
  }

  // Deactivate any existing active salary for this employee
  await supabaseAdmin
    .from("salaries")
    .update({ status: "revised", effective_to: effective_from })
    .eq("employee_id", employee_id)
    .eq("status", "active");

  const { data, error } = await supabaseAdmin
    .from("salaries")
    .insert({
      employee_id,
      gross_salary: Number(gross_salary),
      base_salary: Number(base_salary || 0),
      hra: Number(hra || 0),
      special_allowance: Number(special_allowance || 0),
      performance_bonus: Number(performance_bonus || 0),
      travel_allowance: Number(travel_allowance || 0),
      medical_allowance: Number(medical_allowance || 0),
      other_allowances: Number(other_allowances || 0),
      pf_employee: Number(pf_employee || 0),
      pf_employer: Number(pf_employer || 0),
      professional_tax: Number(professional_tax || 0),
      tds: Number(tds || 0),
      other_deductions: Number(other_deductions || 0),
      net_salary: Number(net_salary || gross_salary),
      payment_frequency: payment_frequency || "monthly",
      effective_from,
      effective_to: effective_to || null,
      status: "active",
      perks: perks || null,
      notes: notes || null,
      created_by: sessionUser.id,
    })
    .select(`*, employee:profiles!salaries_employee_id_fkey(id, full_name, designation, department)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ salary: data });
}

export const dynamic = "force-dynamic";
