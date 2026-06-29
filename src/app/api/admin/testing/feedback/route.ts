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

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const rating = url.searchParams.get("rating");
  const search = url.searchParams.get("search");

  try {
    let query = supabaseAdmin.from("feedback").select(`
      *,
      tester:testers(id, full_name, email)
    `).order("created_at", { ascending: false });

    if (search) query = query.or(`overall_experience.ilike.%${search}%,suggestions.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const transformed = (data || []).map(f => ({
      id: f.id,
      user_email: f.tester?.email || null,
      user_name: f.tester?.full_name || null,
      rating: f.rating,
      category: category || "general",
      message: f.overall_experience || f.suggestions || "No feedback",
      app_version: f.app_version,
      device_info: f.device_info,
      created_at: f.created_at,
    })).filter(f => {
      if (category && category !== "all" && f.category !== category) return false;
      if (rating && rating !== "all" && String(f.rating) !== rating) return false;
      return true;
    });

    return NextResponse.json({ data: transformed });
  } catch {
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}