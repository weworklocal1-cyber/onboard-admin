"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Clock, Award, ChevronRight } from "lucide-react";
import Link from "next/link";

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  progressPct: number;
  enrolledAt: string;
  status: string;
  duration_minutes: number;
}

export default function MyCoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollmentData } = await supabase
        .from("academy_enrollments")
        .select(`
          *,
          course:academy_courses!inner(id, title, slug, duration_minutes)
        `)
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (enrollmentData) {
        const enriched = await Promise.all((enrollmentData || []).map(async (enrollment: any) => {
          const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
          const { data: modulesData } = await supabase
            .from("academy_modules")
            .select("id")
            .eq("course_id", course.id);

          const moduleIds = (modulesData || []).map(m => m.id);

          const { count } = moduleIds.length > 0 ? await supabase
            .from("academy_lessons")
            .select("*", { count: "exact", head: true })
            .in("module_id", moduleIds) : { count: 0 };

          const { count: completedCount } = await supabase
            .from("academy_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("course_id", course.id)
            .eq("completed", true);

          const total = (count as number) || 0;
          const completed = (completedCount as number) || 0;
          const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            id: course.id,
            title: course.title,
            slug: course.slug,
            progressPct,
            enrolledAt: enrollment.enrolled_at,
            status: enrollment.status,
            duration_minutes: course.duration_minutes,
          };
        }));
        setCourses(enriched);
      }
      setLoading(false);
    };
    fetchCourses();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-200 animate-pulse" />)}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No enrolled courses</h3>
        <p className="text-gray-500 mb-4">Enroll in a certification course to start your journey to the Mobile Application Development internship</p>
        <Link href="/academy/courses" className="inline-block bg-academy-primary text-white px-4 py-2 rounded-lg">
          Browse Certifications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Courses</h1>
        <p className="text-gray-500">Your enrolled and in-progress certification courses</p>
      </div>

      <div className="space-y-4">
        {courses.map((course) => {
          const progress = Math.min(100, Math.max(0, course.progressPct));
          return (
            <Card key={course.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-academy-primary to-academy-secondary flex items-center justify-center shrink-0">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {course.duration_minutes}m total
                    </div>
                    <Badge variant={course.status === "completed" ? "default" : "secondary"}>
                      {course.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-academy-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{progress}% complete</p>
                </div>
                <Link href={`/academy/courses/${course.slug}/learn`}>
                  <button className="bg-academy-primary text-white px-4 py-2 rounded-lg shrink-0">
                    {progress >= 100 ? "Review" : "Continue"}
                  </button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}