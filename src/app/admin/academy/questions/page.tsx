"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import Modal from "@/components/ui/crud-modal";

interface QuestionRow {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  difficulty: string;
  quiz_id: string;
  quiz?: { title: string } | { title: string }[];
}

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
  { value: "d", label: "Option D" },
];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [form, setForm] = useState({
    question: "", option_a: "", option_b: "", option_c: "", option_d: "",
    correct_option: "a", difficulty: "medium", quiz_id: ""
  });

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("adminAuthToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => { Promise.all([fetchQuestions(), fetchQuizzes()]); }, []);

  const fetchQuestions = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/questions", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setQuestions(json.data || []);
    } catch (e) {
      console.error("fetchQuestions failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/quizzes", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setQuizzes((json.data || []).map((q: any) => ({ id: q.id, title: q.title })));
    } catch (e) {
      console.error("fetchQuizzes failed:", e);
    }
  };

  const getQuizTitle = (q: QuestionRow) => {
    const quiz = q.quiz;
    if (Array.isArray(quiz)) return quiz[0]?.title || "";
    return quiz?.title || "";
  };

  const openCreate = () => {
    setEditing(null); setForm({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", difficulty: "medium", quiz_id: quizzes[0]?.id || "" }); setModalOpen(true);
  };

  const openEdit = (q: QuestionRow) => {
    setEditing(q); setForm({ question: q.question, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option, difficulty: q.difficulty, quiz_id: q.quiz_id }); setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.quiz_id) return;
    const headers = getAuthHeaders();
    try {
      const url = editing ? "/api/admin/academy/questions" : "/api/admin/academy/questions";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(editing ? { id: editing.id, ...form } : form) });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Failed"); return; }
      setModalOpen(false); fetchQuestions();
    } catch (e) { alert("Error: " + (e instanceof Error ? e.message : String(e))); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const headers = getAuthHeaders();
    const res = await fetch("/api/admin/academy/questions", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    if (!res.ok) { alert("Failed to delete"); return; }
    fetchQuestions();
  };

  const filteredQuestions = questions.filter((q) => q.question.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-500">Manage question bank</p>
        </div>
        <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={openCreate} disabled={quizzes.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Add Question
        </Button>
      </div>

      {quizzes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Create a quiz first before adding questions.
        </div>
      )}

      <Input placeholder="Search questions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => (
            <Card key={q.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><span className="font-semibold">A:</span> {q.option_a}</p>
                      <p><span className="font-semibold">B:</span> {q.option_b}</p>
                      <p><span className="font-semibold">C:</span> {q.option_c}</p>
                      <p><span className="font-semibold">D:</span> {q.option_d}</p>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="brand">Correct: {q.correct_option.toUpperCase()}</Badge>
                      <Badge variant="secondary">{q.difficulty}</Badge>
                      <Badge variant="outline">{getQuizTitle(q)}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredQuestions.length === 0 && <p className="text-center text-gray-400 py-8">No questions found.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Question" : "Add Question"} size="lg">
        <div className="space-y-4">
          <Select label="Quiz" required options={quizzes.map(q => ({ value: q.id, label: q.title }))} value={form.quiz_id} onValueChange={(v) => setForm({ ...form, quiz_id: v })} />
          <Input label="Question" required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Enter question text" />
          <Input label="Option A" required value={form.option_a} onChange={(e) => setForm({ ...form, option_a: e.target.value })} />
          <Input label="Option B" required value={form.option_b} onChange={(e) => setForm({ ...form, option_b: e.target.value })} />
          <Input label="Option C" required value={form.option_c} onChange={(e) => setForm({ ...form, option_c: e.target.value })} />
          <Input label="Option D" required value={form.option_d} onChange={(e) => setForm({ ...form, option_d: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Correct Option" required options={OPTIONS} value={form.correct_option} onValueChange={(v) => setForm({ ...form, correct_option: v })} />
            <Select label="Difficulty" required options={DIFFICULTY_OPTIONS} value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!form.question.trim() || !form.quiz_id}>{editing ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
