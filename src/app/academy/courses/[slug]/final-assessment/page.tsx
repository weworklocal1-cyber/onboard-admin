"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

export default function FinalAssessmentPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [passingScore, setPassingScore] = useState(68);
  const beforeUnloadHandlerRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const currentQuestion = questions[currentQuestionIndex];

  const loadPersistedAnswers = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(`final_answers_${params.slug}`);
      if (raw) answersRef.current = JSON.parse(raw);
    } catch {}
  }, [params.slug]);

  useEffect(() => {
    loadPersistedAnswers();
  }, [loadPersistedAnswers]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (questions.length > 0 && !submitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    beforeUnloadHandlerRef.current = handleBeforeUnload;
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      if (beforeUnloadHandlerRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
      }
    };
  }, [questions, submitting]);

  const saveAnswer = async (questionId: string, optionLabel: string, correct: boolean) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !attemptId) return;
    await fetch("/api/academy/answers", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId, question_id: questionId, selected_option: optionLabel, is_correct: correct }),
    });
  };

  const selectAnswer = (questionId: string, label: string) => {
    setSelectedOption(label);
    answersRef.current = { ...answersRef.current, [questionId]: label };
    try { sessionStorage.setItem(`final_answers_${params.slug}`, JSON.stringify(answersRef.current)); } catch {}
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    if (beforeUnloadHandlerRef.current) {
      window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !attemptId) return;

    const answerMap = { ...answersRef.current };
    try {
      const raw = sessionStorage.getItem(`final_answers_${params.slug}`);
      if (raw) Object.assign(answerMap, JSON.parse(raw));
    } catch {}

    if (selectedOption && currentQuestion && !answerMap[currentQuestion.id]) {
      answerMap[currentQuestion.id] = selectedOption;
    }

    try { sessionStorage.setItem(`final_answers_${params.slug}`, JSON.stringify(answerMap)); } catch {}

    const selectedQuestionIds = Object.keys(answerMap);
    if (selectedQuestionIds.length === 0) {
      alert(`Submission blocked: no answers were tracked.
Check the browser console for more details.`);
      setSubmitting(false);
      return;
    }

    console.log("[FinalAssessment] submit answers:", JSON.stringify(answerMap), "questions:", questions.length, "answerCount:", selectedQuestionIds.length);

    let correct = 0;
    const scored = questions.map((q) => {
      const selected = (answerMap[q.id] || "").toLowerCase();
      const expected = (q.correct_option || "").toLowerCase();
      const isCorrect = selected && expected && selected === expected;
      if (isCorrect) correct++;
      return { id: q.id, selected, expected, isCorrect };
    });
    for (const q of questions) {
      const selected = (answerMap[q.id] || "").toLowerCase();
      const expected = (q.correct_option || "").toLowerCase();
      const isCorrect = selected && expected && selected === expected;
      await saveAnswer(q.id, answerMap[q.id] || "", isCorrect);
    }
    console.log("[FinalAssessment] scored:", JSON.stringify(scored), "correct:", correct, "pct:", Math.round((correct / questions.length) * 100));

    const percentage = Math.round((correct / questions.length) * 100);

    const { error: attemptError } = await supabase.from("academy_attempts").update({
      score: correct,
      percentage,
      passed: percentage >= passingScore,
      submitted_at: new Date().toISOString(),
    }).eq("id", attemptId);

    if (attemptError) {
      console.error("Failed to update attempt score:", attemptError);
    }

    const { data: course } = await supabase
      .from("academy_courses")
      .select("id")
      .eq("slug", params.slug)
      .single();

    if (percentage >= passingScore && course) {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (token) {
          await fetch("/api/academy/certificates/issue", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ course_id: course.id, score: correct, percentage }),
          });
        }
      } catch (e) {
        console.error("Failed to issue certificate", e);
      }

      try {
        await supabase.from("academy_enrollments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("user_id", user.id).eq("course_id", course.id);
      } catch (e) {
        console.error("Failed to update enrollment", e);
      }
    }

    router.push(`/academy/courses/${params.slug}/results?passed=${percentage >= passingScore}&score=${percentage}&passingScore=${passingScore}`);
  }, [submitting, supabase, attemptId, questions, selectedOption, currentQuestion, params.slug, router, passingScore]);

  useEffect(() => {
    const initAssessment = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: course } = await supabase
        .from("academy_courses")
        .select("id, passing_score")
        .eq("slug", params.slug)
        .single();

      if (!course) return;
      setPassingScore(course.passing_score || 68);

      const { data: enrollment } = await supabase
        .from("academy_enrollments")
        .select("status")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

      if (!enrollment || enrollment.status === "dropped") {
        setLocked(true);
        setLockReason("You must be enrolled and active in this course to take the final assessment.");
        setLoading(false);
        return;
      }

      const { data: modulesData } = await supabase
        .from("academy_modules")
        .select("id")
        .eq("course_id", course.id);

      const moduleIds = (modulesData || []).map((m: any) => m.id);

      const { data: lessonsData } = await supabase
        .from("academy_lessons")
        .select("id")
        .in("module_id", moduleIds);

      const allLessonIds = (lessonsData || []).map((l: any) => l.id);

      if (allLessonIds.length === 0) {
        setLocked(true);
        setLockReason("This course has no lessons yet.");
        setLoading(false);
        return;
      }

      const { data: progressData } = await supabase
        .from("academy_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .in("lesson_id", allLessonIds);

      const completedLessonIds = new Set((progressData || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id));
      const incompleteLessons = allLessonIds.filter((id: string) => !completedLessonIds.has(id));

      if (incompleteLessons.length > 0) {
        setLocked(true);
        setLockReason(`You must complete all ${allLessonIds.length} lessons before taking the final assessment. ${incompleteLessons.length} lesson(s) remaining.`);
        setLoading(false);
        return;
      }

      const { data: quizzesData } = await supabase
        .from("academy_quizzes")
        .select("id")
        .in("module_id", moduleIds);

      const quizIds = (quizzesData || []).map((q: any) => q.id);

      const { data: questionsData } = await supabase
        .from("academy_questions")
        .select("*")
        .in("quiz_id", quizIds);

      const allQuestions = (questionsData || []) as Question[];
      setQuestions(allQuestions.sort(() => Math.random() - 0.5).slice(0, 30));

      const { data: attempt } = await supabase
        .from("academy_attempts")
        .insert({
          user_id: user.id,
          course_id: course.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      setAttemptId(attempt?.id);
      setLoading(false);
    };
    initAssessment();
  }, [supabase, params.slug]);

  useEffect(() => {
    if (questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit, questions.length]);

  useEffect(() => {
    if (locked || questions.length === 0) return;
    const handleVisibility = () => {
      if (document.hidden) {
        alert("Tab switching is not allowed during the assessment. This will be reported.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [locked, questions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedOption(answersRef.current[questions[currentQuestionIndex - 1].id] || null);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      if (selectedOption && questions[currentQuestionIndex]) {
        answersRef.current = { ...answersRef.current, [questions[currentQuestionIndex].id]: selectedOption };
      }
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(answersRef.current[questions[currentQuestionIndex + 1].id] || null);
    }
  };

  if (questions.length === 0 && !locked) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  if (locked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Assessment Locked</h1>
            <p className="text-gray-500 mb-6">{lockReason}</p>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={() => router.push(`/academy/courses/${params.slug}/learn`)}>
              Continue Learning
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const options = currentQuestion
    ? [
        { id: "a", label: currentQuestion.option_a },
        { id: "b", label: currentQuestion.option_b },
        { id: "c", label: currentQuestion.option_c },
        { id: "d", label: currentQuestion.option_d },
      ]
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Final Assessment</h1>
        <Badge variant={timeLeft < 300 ? "warning" : "default"} className="text-lg px-4 py-1">
          <Clock className="h-4 w-4 mr-1" />
          {formatTime(timeLeft)}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-sm text-academy-primary">
        <AlertCircle className="h-4 w-4" />
        <span>Do not leave this page. Leaving will warn you and may submit your assessment.</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-academy-primary h-2 rounded-full transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 space-y-4">
          <p className="text-lg font-semibold">
            Question {currentQuestionIndex + 1}/{questions.length}
          </p>
          <p>{currentQuestion?.question}</p>

          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectAnswer(currentQuestion!.id, opt.id)}
                className={`w-full p-4 text-left border rounded-lg transition-all ${
                  selectedOption === opt.id
                    ? "border-academy-primary bg-academy-light"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium mr-2">{opt.id.toUpperCase()})</span>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            ) : (
              <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleNext}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
