"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import Modal from "@/components/ui/crud-modal";

interface Course { id: string; title: string; }
interface ModuleRow {
  id: string;
  title: string;
  order_no: number;
  course_id: string;
  course?: { title: string } | { title: string }[];
}

export default function AdminModulesPage() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const [form, setForm] = useState({ title: "", order_no: 1, course_id: "" });

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("adminAuthToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => { Promise.all([fetchModules(), fetchCourses()]); }, []);

  const fetchModules = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/modules", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setModules(json.data || []);
    } catch (e) {
      console.error("fetchModules failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/academy/courses", { headers });
      if (res.status === 401) { window.location.href = "/admin"; return; }
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setCourses(json.data || []);
    } catch (e) {
      console.error("fetchCourses failed:", e);
    }
  };

  const getCourseTitle = (m: ModuleRow) => {
    const c = m.course;
    if (Array.isArray(c)) return c[0]?.title || "";
    return c?.title || "";
  };

  const openCreate = () => {
    setEditing(null); setForm({ title: "", order_no: 1, course_id: courses[0]?.id || "" }); setModalOpen(true);
  };

  const openEdit = (mod: ModuleRow) => {
    setEditing(mod); setForm({ title: mod.title, order_no: mod.order_no, course_id: mod.course_id }); setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.course_id) return;
    const headers = getAuthHeaders();
    try {
      const url = editing ? "/api/admin/academy/modules" : "/api/admin/academy/modules";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(editing ? { id: editing.id, ...form } : form) });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Failed"); return; }
      setModalOpen(false); fetchModules();
    } catch (e) { alert("Error: " + (e instanceof Error ? e.message : String(e))); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this module and all its lessons/quiz?")) return;
    const res = await fetch("/api/admin/academy/modules", { method: "DELETE", headers: getAuthHeaders(), body: JSON.stringify({ id }) });
    if (!res.ok) { alert("Failed to delete"); return; }
    fetchModules();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="text-gray-500">Manage course modules</p>
        </div>
        <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={openCreate} disabled={courses.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Add Module
        </Button>
      </div>

      {courses.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Create a course first before adding modules.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod) => (
            <Card key={mod.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">Module {mod.order_no}</Badge>
                    <h3 className="font-semibold">{mod.title}</h3>
                    <Badge variant="outline">{getCourseTitle(mod)}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(mod)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(mod.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {modules.length === 0 && courses.length > 0 && <p className="text-center text-gray-400 py-8">No modules yet.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Module" : "Add Module"}>
        <div className="space-y-4">
          <Select label="Course" required options={courses.map(c => ({ value: c.id, label: c.title }))} value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })} />
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Module title" />
          <Input label="Order Number" type="number" min={1} required value={form.order_no} onChange={(e) => setForm({ ...form, order_no: Number(e.target.value) })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!form.title.trim() || !form.course_id}>{editing ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}