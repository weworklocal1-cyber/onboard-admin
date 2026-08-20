import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    const { data: course } = await supabaseAdmin
      .from("academy_courses")
      .select("id, passing_score, title")
      .eq("slug", slug)
      .single();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: attempt } = await supabaseAdmin
      .from("academy_attempts")
      .select("score, percentage, submitted_at")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!attempt) {
      return NextResponse.json({
        hasAttempt: false,
        courseTitle: course.title,
        passingScore: course.passing_score || 68,
      });
    }

    const score = attempt.score || 0;
    const total = 30;
    const percentage = attempt.percentage || Math.round((score / total) * 100);
    const passed = percentage >= (course.passing_score || 68);

    const getGrade = (pct: number) => {
      if (pct >= 90) return "A";
      if (pct >= 80) return "B";
      if (pct >= (course.passing_score || 68)) return "C";
      return "F";
    };

    return NextResponse.json({
      hasAttempt: true,
      score,
      total,
      percentage,
      passingScore: course.passing_score || 68,
      passed,
      grade: getGrade(percentage),
      courseTitle: course.title,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
