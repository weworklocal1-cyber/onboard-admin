"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

type MeetingNote = {
  id: string;
  title: string;
  content: string | null;
  meeting_date: string;
  meeting_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator: { id: string; full_name: string };
  participants: { id: string; employee: { id: string; full_name: string; department: string | null } }[];
};

type Employee = {
  id: string;
  full_name: string;
  department: string | null;
};

const MEETING_TYPES = [
  { value: "standup", label: "Daily Stand-up" },
  { value: "weekly", label: "Weekly Sync" },
  { value: "retrospective", label: "Retrospective" },
  { value: "planning", label: "Sprint Planning" },
  { value: "other", label: "Other" },
];

export default function MeetingNotesPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const [form, setForm] = useState({
    title: "",
    content: "",
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: "standup",
    participant_ids: [] as string[],
  });

  useEffect(() => {
    if (authLoading || !profile) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [notesData, employeesData] = await Promise.all([
          supabase.from("meeting_notes").select(`*, creator:profiles!created_by(full_name), participants:meeting_note_participants(employee:profiles!employee_id(id, full_name, department))`).order("meeting_date", { ascending: false }),
          supabase.from("profiles").select("id, full_name, department").order("full_name"),
        ]);

        if (active) {
          setNotes(notesData.data || []);
          setEmployees(employeesData.data || []);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [profile, authLoading, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/meeting-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create meeting note");
      }

      const data = await res.json();
      setNotes((prev) => [data.note, ...prev]);
      setShowModal(false);
      setForm({
        title: "",
        content: "",
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_type: "standup",
        participant_ids: [],
      });
      toast.success("Meeting note created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create meeting note");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/meeting-notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }

      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Meeting note deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  const filteredNotes = filterType
    ? notes.filter((n) => n.meeting_type === filterType)
    : notes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Notes</h1>
          <p className="text-sm text-gray-500">
            Capture stand-ups, syncs, and retrospectives.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Note
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MEETING_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-500">
            No meeting notes yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{note.title}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      {note.meeting_date} • {MEETING_TYPES.find(t => t.value === note.meeting_type)?.label || note.meeting_type} • by {note.creator?.full_name || "Unknown"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {note.content && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                )}
                {note.participants && note.participants.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {note.participants.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                      >
                        {p.employee?.full_name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">New Meeting Note</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Meeting title"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.meeting_date}
                    onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.meeting_type}
                    onValueChange={(value) => setForm({ ...form, meeting_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Meeting notes, action items..."
                  rows={5}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Participants</Label>
                <Select
                  onValueChange={(value) => {
                    if (value && !form.participant_ids.includes(value)) {
                      setForm({ ...form, participant_ids: [...form.participant_ids, value] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add participant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => !form.participant_ids.includes(e.id))
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} {emp.department ? `(${emp.department})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {form.participant_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.participant_ids.map((id) => {
                      const emp = employees.find((e) => e.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                        >
                          {emp?.full_name || id}
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, participant_ids: form.participant_ids.filter((pid) => pid !== id) })}
                            className="text-gray-500 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Creating..." : "Create Note"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
