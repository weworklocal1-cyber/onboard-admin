import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin, isLeadOrAbove } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, department")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(sessionUser.role);
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  const { data: jobOpenings, error } = await supabaseAdmin
    .from("job_openings")
    .select(`*, hiring_manager_profile:profiles!hiring_manager(full_name)`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobOpenings });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsLeadOrAbove = await isLeadOrAbove(sessionUser.role);
  if (!userIsLeadOrAbove) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, department, employment_type, openings, description, experience_min, experience_max, ctc_min, ctc_max } = body;

    if (!title || !department || !employment_type) {
      return NextResponse.json({ error: "Title, department, and employment type are required" }, { status: 400 });
    }

    const jobId = `LW-JOB-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabaseAdmin
      .from("job_openings")
      .insert({
        job_id: jobId,
        title,
        department,
        employment_type,
        openings: openings || 1,
        description,
        experience_min,
        experience_max,
        ctc_min,
        ctc_max,
        hiring_manager: sessionUser.id,
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobOpening: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}