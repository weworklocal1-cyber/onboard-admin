"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import Modal from "@/components/ui/crud-modal";

interface QuizRow {
  id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number;
  module_id: string;
  module?: { title: string } | { title: string }[];
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuizRow | null>(null);
  const [form, setForm] = useState({ title: "", passing_score: 70, time_limit_minutes: 15, module_id: "" });

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("adminAuthToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => { Promise.all([fetchQuizzes(), fetchModules()]); }, []);

  const fetchQuizzes = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/quizzes", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setQuizzes(json.data || []);
    } catch (e) {
      console.error("fetchQuizzes failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/modules", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setModules((json.data || []).map((m: any) => ({ id: m.id, title: m.title })));
    } catch (e) {
      console.error("fetchModules failed:", e);
    }
  };

  const getModuleTitle = (q: QuizRow) => {
    const m = q.module;
    if (Array.isArray(m)) return m[0]?.title || "";
    return m?.title || "";
  };

  const openCreate = () => {
    setEditing(null); setForm({ title: "", passing_score: 70, time_limit_minutes: 15, module_id: modules[0]?.id || "" }); setModalOpen(true);
  };

  const openEdit = (quiz: QuizRow) => {
    setEditing(quiz); setForm({ title: quiz.title, passing_score: quiz.passing_score, time_limit_minutes: quiz.time_limit_minutes, module_id: quiz.module_id }); setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.module_id) return;
    const headers = getAuthHeaders();
    try {
      const url = editing ? "/api/admin/academy/quizzes" : "/api/admin/academy/quizzes";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(editing ? { id: editing.id, ...form } : form) });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Failed"); return; }
      setModalOpen(false); fetchQuizzes();
    } catch (e) { alert("Error: " + (e instanceof Error ? e.message : String(e))); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz and all questions?")) return;
    const headers = getAuthHeaders();
    const res = await fetch("/api/admin/academy/quizzes", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    if (!res.ok) { alert("Failed to delete"); return; }
    fetchQuizzes();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-500">Manage quizzes</p>
        </div>
        <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={openCreate} disabled={modules.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Add Quiz
        </Button>
      </div>

      {modules.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Create a module first before adding quizzes.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <Badge variant="brand">Pass: {quiz.passing_score}%</Badge>
                    <span className="text-xs text-gray-400">{quiz.time_limit_minutes} min</span>
                    <Badge variant="outline">{getModuleTitle(quiz)}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(quiz)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(quiz.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {quizzes.length === 0 && modules.length > 0 && <p className="text-center text-gray-400 py-8">No quizzes yet.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Quiz" : "Add Quiz"}>
        <div className="space-y-4">
          <Select label="Module" required options={modules.map(m => ({ value: m.id, label: m.title }))} value={form.module_id} onValueChange={(v) => setForm({ ...form, module_id: v })} />
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quiz title" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Passing Score (%)" type="number" min={1} max={100} required value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} />
            <Input label="Time Limit (min)" type="number" min={1} required value={form.time_limit_minutes} onChange={(e) => setForm({ ...form, time_limit_minutes: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!form.title.trim() || !form.module_id}>{editing ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
