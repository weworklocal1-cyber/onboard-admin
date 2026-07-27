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

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sprintId = searchParams.get("sprint_id");

  if (!sprintId) {
    return NextResponse.json({ error: "sprint_id is required" }, { status: 400 });
  }

  const { data: sprint } = await supabaseAdmin
    .from("sprints")
    .select("id, name, start_date, end_date")
    .eq("id", sprintId)
    .single();

  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, status, estimated_hours, actual_hours, created_at, completed_at")
    .eq("sprint_id", sprintId);

  const totalEstimated = (tasks || []).reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

  const days = [];
  const today = new Date();
  const effectiveEnd = today > endDate ? endDate : today;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    const completedByDate = (tasks || []).filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      const compareDate = new Date(currentDate);
      compareDate.setHours(23, 59, 59, 999);
      return completedDate <= compareDate;
    });

    const completedHours = completedByDate.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const remaining = Math.max(0, totalEstimated - completedHours);

    days.push({
      date: dateStr,
      day: i + 1,
      ideal: Math.max(0, totalEstimated * (1 - i / (totalDays - 1 || 1))),
      actual: remaining,
    });
  }

  const completedCount = (tasks || []).filter(t => t.status === "completed" || t.completed_at).length;
  const totalCount = (tasks || []).length;

  return NextResponse.json({
    sprint,
    days,
    totalEstimated,
    totalCount,
    completedCount,
  });
}
