"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit, Trash2 } from "lucide-react";
import Modal from "@/components/ui/crud-modal";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  passing_score: number;
  is_published: boolean;
  is_free: boolean;
  price: number;
  currency: string;
  instructor_name?: string;
  what_you_will_learn?: string[];
  thumbnail_url?: string;
  original_price?: number;
  discounted_price?: number;
  offer_duration_days?: number;
}

const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"];
const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP"];

export default function AdminCoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: "", description: "", difficulty: "beginner", passing_score: 68, is_published: false, is_free: true, price: 0, currency: "INR", instructor_name: "", what_you_will_learn: "", thumbnail_url: "", original_price: 0, discounted_price: 0, offer_duration_days: 3 });

  useEffect(() => { fetchCourses(); }, []);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("adminAuthToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
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
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", difficulty: "beginner", passing_score: 68, is_published: false, is_free: true, price: 0, currency: "INR", instructor_name: "", what_you_will_learn: "", thumbnail_url: "", original_price: 0, discounted_price: 0, offer_duration_days: 3 });
    setModalOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({ title: course.title, description: course.description, difficulty: course.difficulty, passing_score: course.passing_score, is_published: course.is_published, is_free: course.is_free, price: course.price, currency: course.currency, instructor_name: course.instructor_name || "", what_you_will_learn: (course.what_you_will_learn || []).join("\n"), thumbnail_url: course.thumbnail_url || "", original_price: (course as any).original_price || 0, discounted_price: (course as any).discounted_price || 0, offer_duration_days: (course as any).offer_duration_days || 3 });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const headers = getAuthHeaders();

    try {
      const url = editing ? `/api/admin/academy/courses` : `/api/admin/academy/courses`;
      const method = editing ? "PATCH" : "POST";
      const payload: any = editing ? { id: editing.id, ...form, slug } : { ...form, slug };
      if (form.is_free) {
        payload.price = 0;
        payload.currency = "INR";
        payload.original_price = 0;
        payload.discounted_price = 0;
        payload.offer_duration_days = 0;
      }
      if (form.what_you_will_learn) {
        payload.what_you_will_learn = form.what_you_will_learn.split("\n").filter((line: string) => line.trim() !== "");
      }
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to save course");
        return;
      }

      setModalOpen(false);
      fetchCourses();
    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course and all related data?")) return;
    const headers = getAuthHeaders();
    try {
      const res = await fetch("/api/admin/academy/courses", { method: "DELETE", headers, body: JSON.stringify({ id }) });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || json.details || "Failed to delete");
        return;
      }
      fetchCourses();
    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500">Manage academy courses</p>
        </div>
        <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Course
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <Card key={course.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    <Badge variant={course.is_published ? "brand" : "secondary"}>{course.is_published ? "Published" : "Draft"}</Badge>
                    <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
                    <Badge variant={course.is_free ? "secondary" : "default"}>{course.is_free ? "Free" : `Paid (${course.currency} ${course.price})`}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">{course.description}</p>
                  <p className="text-sm text-gray-400 mt-1">Passing: {course.passing_score}% {course.instructor_name ? `• Instructor: ${course.instructor_name}` : ""}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(course)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(course.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {courses.length === 0 && <p className="text-center text-gray-400 py-8">No courses yet. Click the Add Course button to create one.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Course" : "Add Course"} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Course title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (optional)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://example.com/image.jpg" />
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-lg border" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
              <input type="number" min={0} max={100} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.instructor_name} onChange={(e) => setForm({ ...form, instructor_name: e.target.value })} placeholder="LocalWala Team" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={form.is_free}>
                {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="free" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} className="h-4 w-4 rounded accent-academy-primary" />
              <label htmlFor="free" className="text-sm text-gray-700">Free course</label>
            </div>
            {!form.is_free && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Price ({form.currency}):</label>
                <input type="number" min={1} step={1} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            )}
          </div>
          {!form.is_free && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Price ({form.currency})</label>
                  <input type="number" min={1} step={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} placeholder="e.g. 1999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price ({form.currency})</label>
                  <input type="number" min={0} step={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.discounted_price} onChange={(e) => setForm({ ...form, discounted_price: Number(e.target.value) })} placeholder="e.g. 499" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Duration (Days)</label>
                  <input type="number" min={0} step={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary" value={form.offer_duration_days} onChange={(e) => setForm({ ...form, offer_duration_days: Number(e.target.value) })} placeholder="3" />
                  <p className="text-xs text-gray-400 mt-1">New users will see the discounted price for this many days after registration.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Selling Price ({form.currency})</label>
                  <input type="number" min={1} step={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary bg-gray-50" value={form.price} readOnly />
                  <p className="text-xs text-gray-400 mt-1">Auto-set to discounted price if within offer period, otherwise original price.</p>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What You Will Learn (one per line)</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary h-24 resize-none" value={form.what_you_will_learn} onChange={(e) => setForm({ ...form, what_you_will_learn: e.target.value })} placeholder="Understand core concepts&#10;Build real projects&#10;Earn a certificate" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pub" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="h-4 w-4 rounded accent-academy-primary" />
            <label htmlFor="pub" className="text-sm text-gray-700">Publish immediately</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!form.title.trim()}>{editing ? "Save Changes" : "Create Course"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}