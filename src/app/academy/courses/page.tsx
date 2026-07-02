"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Search, Clock, Award, BookOpen, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  thumbnail_url?: string;
}

interface EnrollmentInfo {
  status: string;
  progressPct: number;
}

export default function CoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Record<string, EnrollmentInfo>>({});
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
  }, [supabase]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("academy_courses")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load courses: " + error.message);
      setCourses([]);
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  const fetchEnrollments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrollmentData } = await supabase
      .from("academy_enrollments")
      .select("course_id, status")
      .eq("user_id", user.id);

    if (enrollmentData) {
      const map: Record<string, EnrollmentInfo> = {};
      for (const e of enrollmentData) {
        map[e.course_id] = { status: e.status, progressPct: 0 };
      }
      setEnrollments(map);
    }
  };

  const handleEnroll = async (courseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/academy/login";
      return;
    }

    setEnrollingId(courseId);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setEnrollingId(null);
      return;
    }

    try {
      const res = await fetch("/api/academy/enrollments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to enroll");
      }
    } catch {
      toast.error("An unexpected error occurred during enrollment");
    } finally {
      setEnrollingId(null);
      fetchEnrollments();
    }
  };

  const filteredCourses = courses.filter((c) =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Browse Certifications</h1>
        <p className="text-gray-500">Complete the course, earn your certificate, and qualify for the Mobile Application Development internship</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search courses..."
          className="pl-10 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrollment = enrollments[course.id];
            return (
              <Card key={course.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="h-48 relative">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full bg-gradient-to-br from-academy-primary to-academy-secondary">
                      <BookOpen className="h-16 w-16 text-white/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <Award className="h-3 w-3 mr-1" />
                    Certificate
                  </Badge>
                  {enrollment && (
                    <Badge className="absolute top-3 left-3 bg-green-500 text-white border-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {enrollment.status === "completed" ? "Completed" : "Enrolled"}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold">{course.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
                  {enrollment && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-academy-primary h-1.5 rounded-full transition-all" style={{ width: `${enrollment.progressPct}%` }} />
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration_minutes}m
                    </div>
                    <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
                  </div>
                  {enrollment ? (
                    <a href={`/academy/courses/${course.slug}/learn`}>
                      <Button className="w-full bg-academy-primary hover:bg-academy-secondary">
                        {enrollment.status === "completed" ? "Review Course" : "Continue Learning"}
                      </Button>
                    </a>
                  ) : (
                    <Button
                      className="w-full bg-academy-primary hover:bg-academy-secondary"
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId === course.id}
                    >
                      {enrollingId === course.id ? "Enrolling..." : "Enroll Now"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredCourses.length === 0 && (
        <p className="text-center text-gray-500 py-12">No courses found matching your criteria.</p>
      )}
    </div>
  );
}