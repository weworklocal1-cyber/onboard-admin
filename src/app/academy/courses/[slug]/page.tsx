"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Clock, BookOpen, Award, Target, Users, CheckCircle2, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  passing_score: number;
  is_published: boolean;
  thumbnail_url?: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  quiz?: Quiz;
}

interface Lesson {
  id: string;
  title: string;
  duration_minutes: number;
}

interface Quiz {
  id: string;
  title: string;
}

export default function CourseOverviewPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      const { data: courseData } = await supabase
        .from("academy_courses")
        .select("*")
        .eq("slug", params.slug)
        .single();

      if (!courseData) return;
      setCourse(courseData);

      const { data: modulesData } = await supabase
        .from("academy_modules")
        .select(`
          *,
          lessons:academy_lessons(*),
          quiz:academy_quizzes(id, title)
        `)
        .eq("course_id", courseData.id)
        .order("order_no");

      setModules(modulesData || []);
      setTotalLessons(modulesData?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0);
      setTotalQuizzes(modulesData?.filter(m => m.quiz).length || 0);
      setLoading(false);
    };
    fetchCourse();
  }, [supabase, params.slug]);

  const handleEnroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !course) {
      window.location.href = "/academy/login";
      return;
    }

    setEnrolling(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        window.location.href = "/academy/login";
        return;
      }

      const res = await fetch("/api/academy/enrollments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to enroll");
        setEnrolling(false);
        return;
      }

      const { data: lessons } = await supabase
        .from("academy_lessons")
        .select("id")
        .eq("module_id", modules[0]?.id);

      if (lessons && lessons.length > 0) {
        await supabase.from("academy_progress").insert({
          user_id: user.id,
          lesson_id: lessons[0].id,
          completed: false,
        });
      }

      router.push(`/academy/courses/${params.slug}/learn`);
    } catch {
      toast.error("An unexpected error occurred during enrollment");
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  if (!course) {
    return <div className="text-center py-12">Course not found</div>;
  }

  return (
    <div className="space-y-6">
      {course.thumbnail_url ? (
        <div className="relative h-56 rounded-2xl overflow-hidden">
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl font-bold text-white">{course.title}</h1>
          </div>
        </div>
      ) : (
        <div className="relative h-56 rounded-2xl bg-gradient-to-r from-academy-primary to-academy-secondary overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-24 w-24 text-white/20" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/30 to-transparent">
            <h1 className="text-3xl font-bold text-white">{course.title}</h1>
            <p className="text-white/80 mt-1">Course to prepare you for internships at LocalWala</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-xl bg-white shadow-sm border">
          <Clock className="h-6 w-6 text-academy-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">Duration</p>
          <p className="font-semibold">{course.duration_minutes} Minutes</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-white shadow-sm border">
          <FileText className="h-6 w-6 text-academy-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">Lessons</p>
          <p className="font-semibold">{totalLessons}</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-white shadow-sm border">
          <Award className="h-6 w-6 text-academy-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">Final Test</p>
          <p className="font-semibold">{totalQuizzes * 5} Questions</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-white shadow-sm border">
          <Target className="h-6 w-6 text-academy-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">Passing Score</p>
          <p className="font-semibold">{course.passing_score}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{course.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  "Understand core Local Commerce concepts",
                  "Learn digital commerce workflows",
                  "Master professional skills for internships",
                ].map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-academy-primary mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module, idx) => (
                  <div key={module.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Module {idx + 1}: {module.title}</h4>
                    <div className="space-y-1">
                      {module.lessons?.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-600">• {lesson.title}</span>
                          <span className="text-gray-400">{lesson.duration_minutes}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-academy-light flex items-center justify-center">
                  <Users className="h-6 w-6 text-academy-primary" />
                </div>
                <div>
                  <p className="font-semibold">LocalWala Team</p>
                  <p className="text-sm text-gray-500">Expert Instructors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-academy-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-academy-primary" />
                Certificate Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Complete this course and earn a verified certificate
              </p>
          <Button
            className="w-full bg-academy-primary hover:bg-academy-secondary"
            onClick={handleEnroll}
            disabled={enrolling}
            isLoading={enrolling}
          >
            {enrolling ? "Enrolling..." : "Enroll Now"}
          </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}