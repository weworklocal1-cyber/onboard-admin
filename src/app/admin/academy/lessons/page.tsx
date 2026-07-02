"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import Modal from "@/components/ui/crud-modal";

interface LessonRow {
  id: string;
  title: string;
  order_no: number;
  duration_minutes: number;
  lesson_type: string;
  module_id: string;
  content_md?: string;
  video_url?: string;
  module?: { title: string } | { title: string }[];
}

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [modules, setModules] = useState<{ id: string; title: string; course_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [form, setForm] = useState({ title: "", content_md: "", video_url: "", order_no: 1, duration_minutes: 5, lesson_type: "text", module_id: "" });

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("adminAuthToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => { Promise.all([fetchLessons(), fetchModules()]); }, []);

  const fetchLessons = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/lessons", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setLessons(json.data || []);
    } catch (e) {
      console.error("fetchLessons failed:", e);
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
      setModules((json.data || []).map((m: any) => ({ id: m.id, title: m.title, course_id: m.course_id })));
    } catch (e) {
      console.error("fetchModules failed:", e);
    }
  };

  const getModuleTitle = (l: LessonRow) => {
    const m = l.module;
    if (Array.isArray(m)) return m[0]?.title || "";
    return m?.title || "";
  };

  const openCreate = () => {
    setEditing(null); setForm({ title: "", content_md: "", video_url: "", order_no: 1, duration_minutes: 5, lesson_type: "text", module_id: modules[0]?.id || "" }); setModalOpen(true);
  };

  const openEdit = (lesson: LessonRow) => {
    setEditing(lesson); setForm({ title: lesson.title, content_md: lesson.content_md || "", video_url: lesson.video_url || "", order_no: lesson.order_no, duration_minutes: lesson.duration_minutes, lesson_type: lesson.lesson_type, module_id: lesson.module_id }); setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.module_id) return;
    const headers = getAuthHeaders();
    try {
      const url = editing ? "/api/admin/academy/lessons" : "/api/admin/academy/lessons";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(editing ? { id: editing.id, ...form } : form) });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Failed"); return; }
      setModalOpen(false); fetchLessons();
    } catch (e) { alert("Error: " + (e instanceof Error ? e.message : String(e))); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    const headers = getAuthHeaders();
    const res = await fetch("/api/admin/academy/lessons", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    if (!res.ok) { alert("Failed to delete"); return; }
    fetchLessons();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lessons</h1>
          <p className="text-gray-500">Manage course lessons</p>
        </div>
        <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={openCreate} disabled={modules.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Add Lesson
        </Button>
      </div>

      {modules.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Create a module first before adding lessons.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{lesson.title}</h3>
                    <Badge variant="outline">{lesson.lesson_type}</Badge>
                    <span className="text-xs text-gray-400">{lesson.duration_minutes} min</span>
                  </div>
                  <p className="text-sm text-gray-500">{getModuleTitle(lesson)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(lesson)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(lesson.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {lessons.length === 0 && modules.length > 0 && <p className="text-center text-gray-400 py-8">No lessons yet.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Lesson" : "Add Lesson"}>
        <div className="space-y-4">
          <Select label="Module" required options={modules.map(m => ({ value: m.id, label: m.title }))} value={form.module_id} onValueChange={(v) => setForm({ ...form, module_id: v })} />
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Lesson title" />
          <Textarea label="Notes / Content (Markdown)" value={form.content_md} onChange={(e) => setForm({ ...form, content_md: e.target.value })} placeholder="# Lesson notes in Markdown..." />
          <Input label="Video URL" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Order" type="number" min={1} required value={form.order_no} onChange={(e) => setForm({ ...form, order_no: Number(e.target.value) })} />
            <Input label="Duration (min)" type="number" min={1} required value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          </div>
          <Select label="Type" required options={[{ value: "text", label: "Text" }, { value: "video", label: "Video" }, { value: "quiz", label: "Quiz" }]} value={form.lesson_type} onValueChange={(v) => setForm({ ...form, lesson_type: v })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!form.title.trim() || !form.module_id}>{editing ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}