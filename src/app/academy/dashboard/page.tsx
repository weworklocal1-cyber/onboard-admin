"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Clock, Award, Trophy, BookOpen, ChevronRight, Briefcase } from "lucide-react";
import Link from "next/link";

interface ContinueCourse {
  course_id: string;
  course_title: string;
  slug: string;
  progressPct: number;
  totalLessons: number;
  completedLessons: number;
}

interface Certificate {
  id: string;
  course_title: string;
  issued_at: string;
  score: number;
  certificate_id: string;
}

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  points: number;
}

export default function AcademyDashboard() {
  const supabase = createClient();
  const [continueCourse, setContinueCourse] = useState<ContinueCourse | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [learningMinutes, setLearningMinutes] = useState(0);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

       setUserName((user.user_metadata?.full_name as string) || (user as any).full_name || "");

      const { data: enrollmentData } = await supabase
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

      if (enrollmentData) {
        const course = Array.isArray(enrollmentData.course) ? enrollmentData.course[0] : enrollmentData.course;

        const { data: modulesData } = await supabase
          .from("academy_modules")
          .select("id")
          .eq("course_id", course.id);

        const moduleIds = (modulesData || []).map((m: any) => m.id);

        const { count: totalLessonsCount } = moduleIds.length
          ? await supabase
              .from("academy_lessons")
              .select("*", { count: "exact", head: true })
              .in("module_id", moduleIds)
          : { count: 0 } as any;

        const { count: completedLessonsCount } = moduleIds.length
          ? await supabase
              .from("academy_progress")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("lesson_id", moduleIds.length
                ? (await supabase.from("academy_lessons").select("id").in("module_id", moduleIds)).data?.map((l: any) => l.id) || []
                : [])
              .eq("completed", true)
          : { count: 0 } as any;

        const total = (totalLessonsCount as number) || 0;
        const completed = (completedLessonsCount as number) || 0;
        const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

        setContinueCourse({
          course_id: course.id,
          course_title: course.title,
          slug: course.slug,
          progressPct,
          totalLessons: total,
          completedLessons: completed,
        });
      }

      const { data: certificateData } = await supabase
        .from("academy_certificates")
        .select(`
          certificate_id,
          score,
          issued_at,
          course:academy_courses!inner(title)
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (certificateData) {
        setCertificates(certificateData.map((c: any) => {
          const course = Array.isArray(c.course) ? c.course[0] : c.course;
          return {
            id: c.certificate_id,
            course_title: course?.title || "Unknown Course",
            issued_at: c.issued_at,
            score: c.score || 0,
            certificate_id: c.certificate_id,
          };
        }));
      }

      const { data: xpData } = await supabase
        .from("academy_xp")
        .select("points, streak")
        .eq("user_id", user.id)
        .maybeSingle();

      if (xpData) {
        setStreak((xpData as any).streak || 0);
      }

      const { data: allXp } = await supabase
        .from("academy_xp")
        .select("user_id, points, user_name")
        .order("points", { ascending: false })
        .limit(10);

      if (allXp) {
        setLeaderboard(
          allXp.map((entry: any, index: number) => ({
            rank: index + 1,
            full_name: entry.user_name || "Unknown",
            points: entry.points || 0,
          }))
        );
      }

      const { data: progressWithDuration } = await supabase
        .from("academy_progress")
        .select("completed, lesson:academy_lessons!inner(duration_minutes)")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (progressWithDuration) {
        const totalMinutes = progressWithDuration.reduce((sum, p: any) => sum + (p.lesson?.duration_minutes || 0), 0);
        setLearningMinutes(totalMinutes);
      }

      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const learningHours = learningMinutes > 0 ? `${Math.floor(learningMinutes / 60)}h ${learningMinutes % 60}m` : "0h";

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-r from-academy-primary to-academy-secondary text-white overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, {userName || "Learner"}</h1>
              <p className="text-white/80 mb-4">Continue your learning journey toward the Mobile Application Development internship</p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/academy/courses">
                  <button className="bg-white text-academy-primary hover:bg-white/90 px-4 py-2 rounded-lg font-semibold text-sm">
                    Browse Certifications
                  </button>
                </Link>
                {certificates.length > 0 && certificates.some(c => c.score >= 68) && (
                  <>
                    <Link href="/academy/internship-application">
                      <button className="bg-white/20 text-white border border-white/30 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold text-sm flex items-center">
                        Apply for Internship <Briefcase className="h-4 w-4 ml-1" />
                      </button>
                    </Link>
                    <Link href="/academy/internship-letter">
                      <button className="bg-white/20 text-white border border-white/30 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold text-sm flex items-center">
                        Internship Letter <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <BookOpen className="h-24 w-24 text-white/20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {continueCourse && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{continueCourse.course_title}</h3>
              <p className="text-sm text-gray-500">Last lesson: Continue where you left off</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-academy-primary h-2 rounded-full transition-all" style={{ width: `${continueCourse.progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-academy-primary">{continueCourse.progressPct}% Complete</span>
              <Link href={`/academy/courses/${continueCourse.slug}/learn`}>
                <button className="bg-academy-primary text-white px-4 py-2 rounded-lg text-sm">Resume Learning</button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-academy-light flex items-center justify-center">
              <Clock className="h-6 w-6 text-academy-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{learningHours}</p>
              <p className="text-sm text-gray-500">Learning Hours</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-academy-light flex items-center justify-center">
              <Award className="h-6 w-6 text-academy-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{certificates.length}</p>
              <p className="text-sm text-gray-500">Certificates</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-academy-light flex items-center justify-center">
              <Trophy className="h-6 w-6 text-academy-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak} Days</p>
              <p className="text-sm text-gray-500">Learning Streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">My Certificates</h2>
              <Link href="/academy/certificates" className="text-sm text-academy-primary">View All</Link>
            </div>
            <div className="space-y-3">
              {certificates.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Complete a course to earn your first certificate</p>
              ) : (
                certificates.map((cert) => (
                  <Link key={cert.id} href={`/academy/certificates/${cert.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{cert.course_title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(cert.issued_at).toLocaleDateString()} • Score: {cert.score}%
                        </p>
                      </div>
                      <Award className="h-5 w-5 text-academy-primary" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Top Learners</h2>
              <Link href="/academy/leaderboard" className="text-sm text-academy-primary">View All</Link>
            </div>
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No leaderboard data yet</p>
              ) : (
                leaderboard.map((entry) => (
                  <div key={`${entry.rank}-${entry.full_name}`} className="flex items-center gap-3">
                    <Badge className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      {entry.rank}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.full_name}</p>
                      <p className="text-xs text-gray-500">{entry.points} XP</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
