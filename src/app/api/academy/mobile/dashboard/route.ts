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

    const userName = (user.user_metadata?.full_name as string) || (user as any).full_name || "";

    const { data: activeEnrollments } = await supabaseAdmin
      .from("academy_enrollments")
      .select(`
        *,
        course:academy_courses!inner(id, title, slug)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("enrolled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let continueCourse: any = null;
    if (activeEnrollments) {
      const course = Array.isArray(activeEnrollments.course) ? activeEnrollments.course[0] : activeEnrollments.course;

      const { data: modulesData } = await supabaseAdmin
        .from("academy_modules")
        .select("id")
        .eq("course_id", course.id);

      const moduleIds = (modulesData || []).map((m: any) => m.id);

      let totalLessonsCount = 0;
      let completedLessonsCount = 0;

      if (moduleIds.length > 0) {
        const lessonsResult = await supabaseAdmin
          .from("academy_lessons")
          .select("id", { count: "exact", head: true })
          .in("module_id", moduleIds);
        totalLessonsCount = lessonsResult.count || 0;

        const lessonIds = (await supabaseAdmin
          .from("academy_lessons")
          .select("id")
          .in("module_id", moduleIds)).data?.map((l: any) => l.id) || [];

        if (lessonIds.length > 0) {
          const { count } = await supabaseAdmin
            .from("academy_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("lesson_id", lessonIds)
            .eq("completed", true);
          completedLessonsCount = count || 0;
        }
      }

      const progressPct = totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

      continueCourse = {
        course_id: course.id,
        course_title: course.title,
        slug: course.slug,
        progressPct,
        totalLessons: totalLessonsCount,
        completedLessons: completedLessonsCount,
      };
    }

    const { data: certificateData } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        certificate_id,
        score,
        issued_at,
        course:academy_courses!inner(title)
      `)
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    const certificates = (certificateData || []).map((c: any) => {
      const course = Array.isArray(c.course) ? c.course[0] : c.course;
      return {
        id: c.certificate_id,
        course_title: course?.title || "Unknown Course",
        issued_at: c.issued_at,
        score: c.score || 0,
        certificate_id: c.certificate_id,
      };
    });

    const { data: xpData } = await supabaseAdmin
      .from("academy_xp")
      .select("points, streak")
      .eq("user_id", user.id)
      .maybeSingle();

    const streak = xpData?.streak || 0;

    const { data: allXp } = await supabaseAdmin
      .from("academy_xp")
      .select("user_id, points, user_name")
      .order("points", { ascending: false })
      .limit(10);

    const leaderboard = (allXp || []).map((entry: any, index: number) => ({
      rank: index + 1,
      full_name: entry.user_name || "Unknown",
      points: entry.points || 0,
    }));

    const { data: progressWithDuration } = await supabaseAdmin
      .from("academy_progress")
      .select("completed, lesson:academy_lessons!inner(duration_minutes)")
      .eq("user_id", user.id)
      .eq("completed", true);

    const learningMinutes = (progressWithDuration || []).reduce(
      (sum: number, p: any) => sum + (p.lesson?.duration_minutes || 0),
      0
    );

    const learningHours = learningMinutes > 0 ? `${Math.floor(learningMinutes / 60)}h ${learningMinutes % 60}m` : "0h";

    return NextResponse.json({
      userName,
      continueCourse,
      certificates,
      streak,
      learningHours,
      leaderboard,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
