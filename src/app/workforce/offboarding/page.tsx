"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, UserPlus, XCircle } from "lucide-react";
import { format } from "date-fns";

const OFFBOARDING_REASONS = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "contract_end", label: "Contract End" },
  { value: "other", label: "Other" },
];

const STATUS_STYLES: Record<string, string> = {
  initiated: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OffboardingPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { isAdmin } = usePermissions();
  const [offboardings, setOffboardings] = useState<any[]>([]);
  const [loadingData, setLoadingingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingingTasks] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    employee_id: "",
    program_id: "",
    hr_id: "",
    last_working_date: "",
    reason: "resignation",
    resignation_letter_url: "",
  });
  const [interview, setInterview] = useState<any>(null);
  const [interviewForm, setInterviewForm] = useState({
    reason_for_leaving: "",
    liked_most: "",
    liked_least: "",
    suggestions: "",
    would_recommend: false,
    notes: "",
    interview_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [submittingInterview, setSubmittingInterview] = useState(false);

  const isAdminUser = isAdmin(profile?.role || "");

  useEffect(() => {
    if (!profile) return;
    fetchOffboardings();
    if (isAdminUser) fetchEmployees();
  }, [profile]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchOffboardings = async () => {
    setLoadingingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/offboarding", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch offboardings");
      }

      const data = await res.json();
      setOffboardings(data.offboardings || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load offboardings");
    } finally {
      setLoadingingData(false);
    }
  };

  const fetchTasks = async (offboardingId: string) => {
    setLoadingingTasks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/offboarding/${offboardingId}/tasks`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch tasks");
      }

      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoadingingTasks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) {
      toast.error("Employee is required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/offboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create offboarding");
      }

      toast.success("Offboarding initiated successfully");
      setShowModal(false);
      setForm({ employee_id: "", program_id: "", hr_id: "", last_working_date: "", reason: "resignation", resignation_letter_url: "" });
      fetchOffboardings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create offboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/offboarding/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update task");
      }

      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null } : t));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const fetchInterview = async (offboardingId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/offboarding/${offboardingId}/exit-interview`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setInterview(json.interview || null);
        if (json.interview) {
          setInterviewForm({
            reason_for_leaving: json.interview.reason_for_leaving || "",
            liked_most: json.interview.liked_most || "",
            liked_least: json.interview.liked_least || "",
            suggestions: json.interview.suggestions || "",
            would_recommend: json.interview.would_recommend || false,
            notes: json.interview.notes || "",
            interview_date: json.interview.interview_date || format(new Date(), "yyyy-MM-dd"),
          });
        }
      }
    } catch {
      console.error("Failed to fetch interview");
    }
  };

  const handleSubmitInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSubmittingInterview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/offboarding/${selectedId}/exit-interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(interviewForm),
      });
      if (res.ok) {
        toast.success("Exit interview saved");
        setShowInterviewForm(false);
        fetchInterview(selectedId);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save interview");
      }
    } catch {
      toast.error("Failed to save interview");
    }
    setSubmittingInterview(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/offboarding/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete task");
      }

      toast.success("Task deleted");
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offboarding</h1>
          <p className="text-sm text-gray-500">Manage employee exit process and final settlement</p>
        </div>
        {isAdminUser && (
          <Button onClick={() => setShowModal(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Initiate Offboarding
          </Button>
        )}
      </div>

      {offboardings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No offboarding records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offboardings.map((ob) => (
            <Card
              key={ob.id}
              className={`border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${selectedId === ob.id ? "ring-2 ring-brand-primary" : ""}`}
              onClick={() => {
                setSelectedId(ob.id);
                fetchTasks(ob.id);
                fetchInterview(ob.id);
                setShowInterviewForm(false);
                setInterview(null);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{ob.employee?.full_name || "Unknown"}</span>
                  <Badge className={STATUS_STYLES[ob.status] || STATUS_STYLES.initiated}>
                    {ob.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="text-xs text-gray-500">
                  {ob.employee?.designation} • {ob.employee?.department}
                </p>
                <p className="text-xs text-gray-600">Reason: {ob.reason?.replace(/_/g, " ") || "N/A"}</p>
                {ob.last_working_date && (
                  <p className="text-xs text-gray-600">Last Day: {ob.last_working_date}</p>
                )}
                {ob.hr && (
                  <p className="text-xs text-gray-600">HR: {ob.hr.full_name}</p>
                )}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-brand-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, ob.progress || 0))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{ob.progress || 0}% complete</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    Assets: {ob.assets_returned ? "✅" : "❌"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    KT: {ob.knowledge_transferred ? "✅" : "❌"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Access: {ob.access_revoked ? "✅" : "❌"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>Offboarding Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleTaskToggle(task.id, task.status)}
                        className="shrink-0"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-gray-400">Due: {task.due_date}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={task.status === "completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}>
                        {task.status}
                      </Badge>
                      {isAdminUser && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedId && isAdminUser && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Exit Interview</CardTitle>
            {!showInterviewForm && (
              <Button size="sm" onClick={() => { setShowInterviewForm(true); fetchInterview(selectedId); }}>
                {interview ? "Edit Interview" : "Add Interview"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {interview && !showInterviewForm ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Reason for Leaving</p>
                  <p className="text-gray-900">{interview.reason_for_leaving || "N/A"}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Liked Most</p>
                    <p className="text-gray-900">{interview.liked_most || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Liked Least</p>
                    <p className="text-gray-900">{interview.liked_least || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Suggestions</p>
                  <p className="text-gray-900">{interview.suggestions || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Would Recommend:</p>
                  <Badge className={interview.would_recommend ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {interview.would_recommend ? "Yes" : "No"}
                  </Badge>
                </div>
                {interview.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-gray-600">{interview.notes}</p>
                  </div>
                )}
              </div>
            ) : showInterviewForm ? (
              <form onSubmit={handleSubmitInterview} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Reason for Leaving</Label>
                  <Textarea
                    value={interviewForm.reason_for_leaving}
                    onChange={e => setInterviewForm({ ...interviewForm, reason_for_leaving: e.target.value })}
                    placeholder="Why is the employee leaving?"
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Liked Most</Label>
                    <Textarea
                      value={interviewForm.liked_most}
                      onChange={e => setInterviewForm({ ...interviewForm, liked_most: e.target.value })}
                      placeholder="What did they enjoy most?"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Liked Least</Label>
                    <Textarea
                      value={interviewForm.liked_least}
                      onChange={e => setInterviewForm({ ...interviewForm, liked_least: e.target.value })}
                      placeholder="What did they enjoy least?"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Suggestions</Label>
                  <Textarea
                    value={interviewForm.suggestions}
                    onChange={e => setInterviewForm({ ...interviewForm, suggestions: e.target.value })}
                    placeholder="Any suggestions for improvement?"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Interview Date</Label>
                  <Input
                    type="date"
                    value={interviewForm.interview_date}
                    onChange={e => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="would_recommend"
                    checked={interviewForm.would_recommend}
                    onChange={e => setInterviewForm({ ...interviewForm, would_recommend: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="would_recommend">Would recommend company to others</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={interviewForm.notes}
                    onChange={e => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    placeholder="Any additional observations..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1" disabled={submittingInterview}>
                    {submittingInterview ? "Saving..." : "Save Interview"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowInterviewForm(false); if (interview) fetchInterview(selectedId); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No exit interview yet. Click Add Interview to create one.</p>
            )}
          </CardContent>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Initiate Offboarding</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={v => setForm({ ...form, employee_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFBOARDING_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Last Working Date</Label>
                <Input
                  type="date"
                  value={form.last_working_date}
                  onChange={e => setForm({ ...form, last_working_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Resignation Letter URL</Label>
                <Input
                  value={form.resignation_letter_url}
                  onChange={e => setForm({ ...form, resignation_letter_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Initiating..." : "Initiate Offboarding"}
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
