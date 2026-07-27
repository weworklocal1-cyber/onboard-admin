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

const REVIEW_STATUSES = ['draft', 'submitted', 'reviewed', 'acknowledged'];

// GET /api/workforce/performance-reviews
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = canWrite(sessionUser.role);
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");
  const reviewerId = searchParams.get("reviewer_id");

  let query = supabaseAdmin
    .from("performance_reviews")
    .select(`*, employee:profiles!performance_reviews_employee_id_fkey(id, full_name, department, designation), reviewer:profiles!performance_reviews_reviewer_id_fkey(id, full_name)`)
    .order("review_period_end", { ascending: false });

  if (!isAdmin) {
    query = query.or(`employee_id.eq.${sessionUser.id},reviewer_id.eq.${sessionUser.id}`);
  } else {
    if (employeeId) query = query.eq("employee_id", employeeId);
    if (reviewerId) query = query.eq("reviewer_id", reviewerId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data || [] });
}

// POST /api/workforce/performance-reviews
export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      employee_id,
      reviewer_id,
      review_period_start,
      review_period_end,
      rating,
      strengths,
      areas_for_improvement,
      goals,
      overall_comments,
      status,
    } = body;

    if (!employee_id || !reviewer_id || !review_period_start || !review_period_end) {
      return NextResponse.json(
        { error: "Employee, reviewer, and review period are required" },
        { status: 400 }
      );
    }

    if (rating && (Number(rating) < 1 || Number(rating) > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("performance_reviews")
      .insert({
        employee_id,
        reviewer_id: reviewer_id || sessionUser.id,
        review_period_start,
        review_period_end,
        rating: rating ? Number(rating) : null,
        strengths: strengths?.trim() || null,
        areas_for_improvement: areas_for_improvement?.trim() || null,
        goals: goals?.trim() || null,
        overall_comments: overall_comments?.trim() || null,
        status: status || "draft",
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      })
      .select(`*, employee:profiles!performance_reviews_employee_id_fkey(id, full_name, department, designation), reviewer:profiles!performance_reviews_reviewer_id_fkey(id, full_name)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ review: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
