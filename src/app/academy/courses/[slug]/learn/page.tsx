"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, FileText, Download, BookOpen, Award } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";

interface Lesson {
  id: string;
  title: string;
  content_md: string;
  video_url: string;
  duration_minutes: number;
  order_no: number;
  module_id: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  academy_quizzes?: { id: string; title: string }[];
}

interface ProgressMap {
  [lessonId: string]: boolean;
}

export default function LearningPlayerPage({ params }: { params: { slug: string; lessonId?: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [courseId, setCourseId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: course } = await supabase
        .from("academy_courses")
        .select("id")
        .eq("slug", params.slug)
        .single();

      if (!course) {
        setLoading(false);
        return;
      }
      setCourseId(course.id);

      const { data: modulesData } = await supabase
        .from("academy_modules")
        .select("*")
        .eq("course_id", course.id)
        .order("order_no");

      const moduleIds = (modulesData || []).map((m: any) => m.id);

      const { data: lessonsData } = await supabase
        .from("academy_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("order_no");

      const { data: quizzesData } = await supabase
        .from("academy_quizzes")
        .select("id, title, module_id")
        .in("module_id", moduleIds);

      const lessonsByModule: Record<string, any[]> = {};
      for (const l of lessonsData || []) {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push(l);
      }

      const quizzesByModule: Record<string, { id: string; title: string }> = {};
      for (const q of quizzesData || []) {
        quizzesByModule[q.module_id] = { id: q.id, title: q.title };
      }

      const modulesWithRelations = (modulesData || []).map((m: any) => ({
        ...m,
        lessons: lessonsByModule[m.id] || [],
        academy_quizzes: quizzesByModule[m.id] ? [quizzesByModule[m.id]] : [],
      }));

      if (modulesWithRelations.length > 0) {
        const allLessons = modulesWithRelations.flatMap(m => m.lessons || []);
        setTotalLessons(allLessons.length);
        setModules(modulesWithRelations as Module[]);

        let initialLesson: Lesson | null = null;
        let initialModuleIndex = 0;
        let initialLessonIndex = 0;

        if (params.lessonId) {
          for (let mi = 0; mi < modulesWithRelations.length; mi++) {
            const found = modulesWithRelations[mi].lessons?.find((l: any) => l.id === params.lessonId);
            if (found) {
              initialLesson = found as Lesson;
              initialModuleIndex = mi;
              initialLessonIndex = modulesWithRelations[mi].lessons.indexOf(found);
              break;
            }
          }
        }

        if (!initialLesson) {
          initialLesson = modulesWithRelations[0].lessons?.[0] || null;
        }

        setCurrentLesson(initialLesson);
        setCurrentModuleIndex(initialModuleIndex);
        setCurrentLessonIndex(initialLessonIndex);

        const { data: progressData } = await supabase
          .from("academy_progress")
          .select("lesson_id, completed")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .eq("course_id", course.id);

        if (progressData) {
          const progMap: ProgressMap = {};
          let completed = 0;
          for (const p of progressData) {
            progMap[p.lesson_id] = p.completed;
            if (p.completed) completed++;
          }
          setProgressMap(progMap);
          setCompletedCount(completed);
        }

        const { data: enrollmentData } = await supabase
          .from("academy_enrollments")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .eq("course_id", course.id)
          .maybeSingle();

        if (enrollmentData) setEnrollmentId(enrollmentData.id);
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, params.slug, params.lessonId]);

  const isCompleted = (lessonId: string) => !!progressMap[lessonId];

  const isModuleComplete = (moduleIndex: number) => {
    const mod = modules[moduleIndex];
    if (!mod.lessons || mod.lessons.length === 0) return false;
    return mod.lessons.every((lesson) => isCompleted(lesson.id));
  };

  const isCourseComplete = () => {
    if (modules.length === 0) return false;
    return modules.every((_, mi) => isModuleComplete(mi));
  };

  const markComplete = async () => {
    if (!currentLesson || !courseId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;

    await fetch("/api/academy/progress", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: currentLesson.id, course_id: courseId, completed: true }),
    });

    setProgressMap({ ...progressMap, [currentLesson.id]: true });
    setCompletedCount(prev => prev + 1);

    setTimeout(() => handleNextLesson(), 800);
  };

  const handleNextLesson = () => {
    const currentModule = modules[currentModuleIndex];
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      const nextLesson = currentModule.lessons[currentLessonIndex + 1];
      setCurrentLesson(nextLesson);
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else if (currentModuleIndex < modules.length - 1) {
      const nextModule = modules[currentModuleIndex + 1];
      const nextLesson = nextModule.lessons[0];
      setCurrentModuleIndex(currentModuleIndex + 1);
      setCurrentLessonIndex(0);
      setCurrentLesson(nextLesson);
    }
  };

  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  if (!currentLesson) {
    return <div className="text-center py-12">No lessons available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{modules[currentModuleIndex]?.title}</h1>
          <p className="text-sm text-gray-500">Lesson {currentLessonIndex + 1} of {modules[currentModuleIndex]?.lessons.length}</p>
        </div>
        <div className="w-48">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-academy-primary h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              {currentLesson.video_url ? (
                <div className="aspect-video bg-gray-900 rounded-t-lg flex items-center justify-center">
                  <a href={currentLesson.video_url} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                    Watch Lesson Video
                  </a>
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-academy-primary/20 to-academy-secondary/20 rounded-t-lg flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-academy-primary/50" />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold">{currentLesson.title}</h2>
                  {isCompleted(currentLesson.id) && (
                    <Badge variant="brand" className="shrink-0 ml-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                {currentLesson.content_md ? (
                  <div className="prose max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentLesson.content_md) }} />
                ) : (
                  <p className="text-gray-500">Lesson content will appear here</p>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => {
                    if (currentLessonIndex > 0) {
                      const prevLesson = modules[currentModuleIndex].lessons[currentLessonIndex - 1];
                      setCurrentLesson(prevLesson);
                      setCurrentLessonIndex(currentLessonIndex - 1);
                    } else if (currentModuleIndex > 0) {
                      const prevModule = modules[currentModuleIndex - 1];
                      const prevLesson = prevModule.lessons[prevModule.lessons.length - 1];
                      setCurrentModuleIndex(currentModuleIndex - 1);
                      setCurrentLessonIndex(prevModule.lessons.length - 1);
                      setCurrentLesson(prevLesson);
                    }
                  }} disabled={currentModuleIndex === 0 && currentLessonIndex === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  {!isCompleted(currentLesson.id) ? (
                    <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={markComplete}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  ) : (
                    <>
                      <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleNextLesson} disabled={currentLessonIndex === modules[currentModuleIndex].lessons.length - 1 && currentModuleIndex === modules.length - 1}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      {modules[currentModuleIndex].academy_quizzes && modules[currentModuleIndex].academy_quizzes.length > 0 && isModuleComplete(currentModuleIndex) && (
                        <Button variant="outline" onClick={() => router.push(`/academy/courses/${params.slug}/quiz/${modules[currentModuleIndex].academy_quizzes![0].id}`)}>
                          <Award className="h-4 w-4 mr-1" />
                          Take Quiz
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lesson Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Key takeaways will appear here</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" disabled>
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Download className="h-4 w-4 mr-2" />
                Additional Materials
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-academy-primary" />
                <span className="text-sm font-medium">Estimated Time</span>
              </div>
              <p className="text-lg font-bold">{currentLesson.duration_minutes} minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {modules.map((mod, mi) => (
                <div key={mod.id}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{mod.title}</p>
                  {mod.lessons?.map((lesson, li) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setCurrentLesson(lesson);
                        setCurrentModuleIndex(mi);
                        setCurrentLessonIndex(li);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${currentLesson?.id === lesson.id ? "bg-academy-light text-academy-primary font-medium" : "hover:bg-gray-50 text-gray-600"}`}
                    >
                      <span className="text-xs">{isCompleted(lesson.id) ? "✔" : "○"}</span>
                      {lesson.title}
                    </button>
                  ))}
                  {mod.academy_quizzes && mod.academy_quizzes.length > 0 && (
                    <button
                      onClick={() => router.push(`/academy/courses/${params.slug}/quiz/${mod.academy_quizzes![0].id}`)}
                      className="w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 text-academy-primary hover:bg-academy-light transition-colors mt-1"
                    >
                      <Award className="h-3 w-3" />
                      {mod.academy_quizzes![0].title}
                      {isModuleComplete(mi) && <span className="text-xs text-green-600 ml-auto">Ready</span>}
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {isCourseComplete() && (
            <Card className="border-0 shadow-lg border-2 border-academy-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-academy-primary" />
                  <span className="font-semibold text-sm">Course Complete!</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">You&apos;ve completed all lessons. Take the final assessment to earn your certificate.</p>
                <Link href={`/academy/courses/${params.slug}/final-assessment`}>
                  <Button className="w-full bg-academy-primary hover:bg-academy-secondary">
                    Take Final Assessment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}