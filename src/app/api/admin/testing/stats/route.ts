import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("admin_users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { id: user.id, role: profile.role, full_name: profile.full_name };
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "founder" && sessionUser.role !== "super_admin" && sessionUser.role !== "hr_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [
      testersRes,
      bugsRes,
      featuresRes,
      feedbackRes,
    ] = await Promise.all([
      supabaseAdmin.from("testers").select("id, status", { count: "exact" }),
      supabaseAdmin.from("bug_reports").select("id, severity, status"),
      supabaseAdmin.from("feature_requests").select("id, status"),
      supabaseAdmin.from("feedback").select("id, rating"),
    ]);

    const stats = {
      total_testers: testersRes.count || 0,
      active_testers: testersRes.data?.filter(t => t.status === "approved").length || 0,
      bug_reports: bugsRes.data?.length || 0,
      feature_requests: featuresRes.data?.length || 0,
      feedback_count: feedbackRes.data?.length || 0,
      average_rating: feedbackRes.data?.length
        ? feedbackRes.data.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackRes.data.length
        : 0,
      bugs_by_severity: bugsRes.data?.reduce((acc, b) => {
        acc[b.severity] = (acc[b.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      bugs_by_status: bugsRes.data?.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      requests_by_status: featuresRes.data?.reduce((acc, f) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
    };

    return NextResponse.json({ data: stats });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}