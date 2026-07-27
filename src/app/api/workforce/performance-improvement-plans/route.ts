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

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin
    .from("performance_improvement_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (!canManage(sessionUser.role)) {
    query = query.eq("employee_id", sessionUser.id);
  } else if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data: plans, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = await enrichPlans(plans || []);
  return NextResponse.json({ plans: enriched });
}

async function enrichPlans(plans: any[]) {
  if (plans.length === 0) return [];

  const employeeIds = Array.from(new Set(plans.map(p => p.employee_id)));
  const creatorIds = Array.from(new Set(plans.map(p => p.created_by)));

  const [empResult, creatorResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, department").in("id", employeeIds),
    supabaseAdmin.from("profiles").select("id, full_name").in("id", creatorIds),
  ]);

  const empMap = new Map((empResult.data || []).map((e: any) => [e.id, e]));
  const creatorMap = new Map((creatorResult.data || []).map((c: any) => [c.id, c]));

  return plans.map((plan) => ({
    ...plan,
    employee: empMap.get(plan.employee_id) || null,
    creator: creatorMap.get(plan.created_by) || null,
  }));
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employee_id, title, description, start_date, end_date, milestones } = body;

    if (!employee_id || !title || !start_date || !end_date) {
      return NextResponse.json({ error: "employee_id, title, start_date, and end_date are required" }, { status: 400 });
    }

    const { data: plan, error } = await supabaseAdmin
      .from("performance_improvement_plans")
      .insert({
        employee_id,
        created_by: sessionUser.id,
        title,
        description: description || "",
        start_date,
        end_date,
      })
      .select("*")
      .single();

    if (error) throw error;

    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      const rows = milestones.map((m: any) => ({
        pip_id: plan.id,
        title: m.title,
        description: m.description || "",
        due_date: m.due_date,
      }));
      await supabaseAdmin.from("pip_milestones").insert(rows);
    }

    const enriched = await enrichPlans([plan]);
    return NextResponse.json({ plan: enriched[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create PIP" }, { status: 500 });
  }
}
