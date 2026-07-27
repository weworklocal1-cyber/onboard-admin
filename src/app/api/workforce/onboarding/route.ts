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

// GET /api/workforce/onboarding
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = canWrite(sessionUser.role);

  let query = supabaseAdmin
    .from("employee_onboarding")
    .select(`
      *, 
      employee:profiles!employee_onboarding_employee_id_fkey(id, full_name, email, department, designation),
      buddy:profiles!employee_onboarding_buddy_id_fkey(id, full_name),
      program:onboarding_programs(id, name, department)
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("employee_id", sessionUser.id).or(`buddy_id.eq.${sessionUser.id}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ onboardings: data || [] });
}

// POST /api/workforce/onboarding
export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { employee_id, program_id, buddy_id } = body;

    if (!employee_id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    let steps: any[] = [];

    if (program_id) {
      const { data: program } = await supabaseAdmin
        .from("onboarding_programs")
        .select("steps")
        .eq("id", program_id)
        .single();

      if (program?.steps) {
        steps = (program.steps as any[]).map((step: any, idx: number) => ({
          ...step,
          id: `step_${idx}`,
          status: "pending",
        }));
      }
    }

    const { data, error } = await supabaseAdmin
      .from("employee_onboarding")
      .insert({
        employee_id,
        program_id: program_id || null,
        buddy_id: buddy_id || null,
        assigned_by: sessionUser.id,
        status: "in_progress",
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (steps.length > 0) {
      const taskInserts = steps.map((step) => ({
        employee_onboarding_id: data.id,
        title: step.title || step.name || `Task ${step.id}`,
        description: step.description || "",
        due_date: step.due_date || null,
        status: "pending",
      }));

      await supabaseAdmin.from("onboarding_tasks").insert(taskInserts);
    }

    const { data: finalData } = await supabaseAdmin
      .from("employee_onboarding")
      .select(`
        *, 
        employee:profiles!employee_onboarding_employee_id_fkey(id, full_name, email, department, designation),
        buddy:profiles!employee_onboarding_buddy_id_fkey(id, full_name),
        program:onboarding_programs(id, name, department)
      `)
      .eq("id", data.id)
      .single();

    return NextResponse.json({ onboarding: finalData }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
