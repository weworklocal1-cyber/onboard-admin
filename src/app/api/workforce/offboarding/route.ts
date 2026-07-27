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

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = canManage(sessionUser.role);

  let query = supabaseAdmin
    .from("employee_offboarding")
    .select(`
      *, 
      employee:profiles!employee_offboarding_employee_id_fkey(id, full_name, email, department, designation),
      hr:profiles!employee_offboarding_hr_id_fkey(id, full_name),
      program:offboarding_programs(id, name, department)
    `)
    .order("initiated_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("employee_id", sessionUser.id).or(`hr_id.eq.${sessionUser.id}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offboardings: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { employee_id, program_id, hr_id, last_working_date, reason, resignation_letter_url } = body;

    if (!employee_id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    let steps: any[] = [];

    if (program_id) {
      const { data: program } = await supabaseAdmin
        .from("offboarding_programs")
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
      .from("employee_offboarding")
      .insert({
        employee_id,
        program_id: program_id || null,
        hr_id: hr_id || sessionUser.id,
        last_working_date: last_working_date || null,
        reason: reason || "resignation",
        resignation_letter_url: resignation_letter_url || null,
        status: "initiated",
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (steps.length > 0) {
      const taskInserts = steps.map((step) => ({
        employee_offboarding_id: data.id,
        title: step.title || step.name || `Task ${step.id}`,
        description: step.description || "",
        due_date: step.due_date || null,
        status: "pending",
      }));

      await supabaseAdmin.from("offboarding_tasks").insert(taskInserts);
    }

    const { data: finalData } = await supabaseAdmin
      .from("employee_offboarding")
      .select(`
        *, 
        employee:profiles!employee_offboarding_employee_id_fkey(id, full_name, email, department, designation),
        hr:profiles!employee_offboarding_hr_id_fkey(id, full_name),
        program:offboarding_programs(id, name, department)
      `)
      .eq("id", data.id)
      .single();

    return NextResponse.json({ offboarding: finalData }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
