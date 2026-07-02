"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle } from "lucide-react";
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

interface Quiz {
  id: string;
  title: string;
  time_limit_minutes: number;
  passing_score: number;
}

export default function QuizPage({ params }: { params: { slug: string; quizId: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const saveAnswer = async (questionId: string, optionLabel: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !attemptId) return;
    const q = questions.find((q) => q.id === questionId);
    const isCorrect = q ? optionLabel === q[`option_${q.correct_option}` as keyof Question] : false;
    await fetch("/api/academy/answers", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId, question_id: questionId, selected_option: optionLabel, is_correct: isCorrect }),
    });
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !attemptId) return;

    let correct = 0;
    for (const q of questions) {
      const selected = answers[q.id];
      const isCorrect = selected === q[`option_${q.correct_option}` as keyof Question];
      if (isCorrect) correct++;
      await saveAnswer(q.id, selected || "");
    }

    const percentage = Math.round((correct / questions.length) * 100);
    const passed = percentage >= (quiz?.passing_score || 68);

    await supabase.from("academy_attempts").update({
      score: correct,
      percentage,
      passed,
      submitted_at: new Date().toISOString(),
    }).eq("id", attemptId);

    setScore(correct);
    setSubmitted(true);
  }, [submitting, supabase, attemptId, questions, answers, quiz]);

  const shuffle = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  useEffect(() => {
    const initQuiz = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/academy/login";
        return;
      }

      const quizId = params?.quizId;
      if (!quizId) {
        console.error("quizId is missing from route params");
        setLoading(false);
        return;
      }

      const { data: questionsData } = await supabase
        .from("academy_questions")
        .select("*")
        .eq("quiz_id", quizId);

      if (questionsData && questionsData.length > 0) {
        setQuestions(shuffle(questionsData));
      } else {
        console.error("No questions found for quiz:", quizId);
      }

      const { data: quizData } = await supabase
        .from("academy_quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizData) {
        setQuiz(quizData);
        setTimeLeft((quizData.time_limit_minutes || 10) * 60);
      }

      const { data: attempt } = await supabase
        .from("academy_attempts")
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      setAttemptId(attempt?.id || null);
      setLoading(false);
    };

    initQuiz();
  }, [supabase, params?.quizId]);

  useEffect(() => {
    if (questions.length === 0 || submitted) return;
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
  }, [handleSubmit, questions.length, submitted]);

  useEffect(() => {
    if (submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        alert("Tab switching is not allowed during the quiz. This will be reported.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOptionSelect = async (optionLabel: string) => {
    setSelectedOption(optionLabel);
    setAnswers((prev) => ({ ...prev, [questions[currentQuestionIndex].id]: optionLabel }));
    await saveAnswer(questions[currentQuestionIndex].id, optionLabel);
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedOption(answers[questions[currentQuestionIndex - 1].id] || null);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(answers[questions[currentQuestionIndex + 1].id] || null);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  if (submitted) {
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= (quiz?.passing_score || 68);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl text-center overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-academy-primary to-academy-secondary" />
          <CardContent className="p-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-academy-light flex items-center justify-center">
                {passed ? <CheckCircle2 className="h-10 w-10 text-academy-primary" /> : <XCircle className="h-10 w-10 text-red-500" />}
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-2">
              {passed ? "Great Job!" : "Keep Practicing!"}
            </h1>
            <p className="text-gray-500 mb-6">
              {passed ? "You passed this quiz" : "Review the material and try again"}
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
            </div>

            <Badge variant={passed ? "default" : "warning"} className="mb-6">
              {passed ? "Passed" : "Failed"}
            </Badge>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                Back to Course
              </Button>
              {passed && (
                <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={() => router.push(`/academy/courses/${params.slug}/learn`)}>
                  Continue Learning
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestionIndex];

  if (!question) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl text-center overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-academy-primary to-academy-secondary" />
          <CardContent className="p-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">No Questions Available</h1>
            <p className="text-gray-500 mb-6">
              This quiz doesn't have any questions yet. Please contact your administrator.
            </p>
            <div className="text-left bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-1">
              <p><strong>Quiz ID:</strong> {params?.quizId || "undefined params"}</p>
              <p><strong>Questions found:</strong> {questions.length}</p>
              <p><strong>Status:</strong> Check Supabase → academy_questions table for quiz_id = {params?.quizId || "undefined params"}</p>
            </div>
            <div className="mt-6">
              <Button variant="outline" onClick={() => router.back()}>
                Back to Course
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const options = [
    { id: "a", label: question.option_a },
    { id: "b", label: question.option_b },
    { id: "c", label: question.option_c },
    { id: "d", label: question.option_d },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{quiz?.title || "Quiz"}</h1>
          <p className="text-gray-500">Test your knowledge</p>
        </div>
        <Badge variant={timeLeft < 60 ? "warning" : "outline"} className="text-lg px-3 py-1">
          <Clock className="h-4 w-4 mr-1" />
          {formatTime(timeLeft)} Remaining
        </Badge>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-academy-primary h-2 rounded-full transition-all"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>
            Question {currentQuestionIndex + 1}/{questions.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">{question.question}</p>

          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleOptionSelect(opt.label)}
                className={`w-full p-4 text-left border rounded-lg transition-all ${
                  selectedOption === opt.label
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
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!selectedOption || submitting}>
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleNext} disabled={!selectedOption}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
