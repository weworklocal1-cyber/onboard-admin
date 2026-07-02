"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Award, Download, ChevronRight, CheckCircle2 } from "lucide-react";

export default function ResultsPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [passingScore, setPassingScore] = useState(68);
  const [loading, setLoading] = useState(true);

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  useEffect(() => {
    const fetchResults = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: course } = await supabase
        .from("academy_courses")
        .select("id, passing_score")
        .eq("slug", params.slug)
        .single();

      if (!course) return;
      setPassingScore(course.passing_score || 68);

      const { data: attempt } = await supabase
        .from("academy_attempts")
        .select("score, percentage, submitted_at")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attempt) {
        setScore(attempt.score || 0);
        setTotal(30);
      }
      setLoading(false);
    };
    fetchResults();
  }, [supabase, params.slug]);

  const getGrade = (pct: number) => {
    if (pct >= 90) return "A";
    if (pct >= 80) return "B";
    if (pct >= passingScore) return "C";
    return "F";
  };

  const passed = percentage >= passingScore;

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-0 shadow-xl text-center overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-academy-primary to-academy-secondary" />
        <CardContent className="p-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-academy-light flex items-center justify-center">
              <Award className="h-10 w-10 text-academy-primary" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {passed ? "Congratulations!" : "Keep Trying!"}
          </h1>
          <p className="text-gray-500 mb-6">
            {passed ? "You've passed the assessment" : "You need above 68% to pass"}
          </p>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div>
              <p className="text-4xl font-bold text-academy-primary">{score} / {total}</p>
              <p className="text-sm text-gray-500">Score</p>
            </div>
            <div className="h-12 w-px bg-gray-200" />
            <div>
              <p className="text-4xl font-bold">{percentage}%</p>
              <p className="text-sm text-gray-500">Percentage</p>
            </div>
            <div className="h-12 w-px bg-gray-200" />
            <div>
              <Badge className="text-2xl px-4 py-2 bg-academy-primary">{getGrade(percentage)}</Badge>
              <p className="text-sm text-gray-500 mt-1">Grade</p>
            </div>
          </div>

          <Badge variant={passed ? "default" : "warning"} className="mb-6">
            {passed ? "Passed" : "Failed"}
          </Badge>

          <div className="flex gap-3 justify-center">
            {passed && (
              <a href="/academy/certificates">
                <button className="bg-academy-primary text-white px-4 py-2 rounded-lg flex items-center">
                  <Download className="h-4 w-4 mr-1" />
                  View Certificates
                </button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {passed && (
        <Card className="border-0 shadow-lg bg-academy-light">
          <CardContent className="p-6 flex items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-academy-primary" />
            <div>
              <h3 className="font-semibold">Internship Eligible</h3>
              <p className="text-sm text-gray-600">You can now apply for LocalWala internships</p>
            </div>
            <a href="/academy/internship-application" className="ml-auto">
              <button className="bg-academy-primary text-white px-4 py-2 rounded-lg flex items-center">
                Apply Now <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}