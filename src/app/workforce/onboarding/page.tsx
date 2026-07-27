"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

type OnboardingStatus = "in_progress" | "completed" | "cancelled";
type TaskStatus = "pending" | "completed";

const STATUS_STYLES: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OnboardingPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { isAdmin } = usePermissions();
  const [onboardings, setOnboardings] = useState<any[]>([]);
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
    buddy_id: "",
  });

  const isAdminUser = isAdmin(profile?.role || "");

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchOnboardings = async () => {
    setLoadingingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/onboarding", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch onboardings");
      }

      const data = await res.json();
      setOnboardings(data.onboardings || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load onboardings");
    } finally {
      setLoadingingData(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchOnboardings();
    if (isAdminUser) fetchEmployees();
  }, [profile]);

  const fetchTasks = async (onboardingId: string) => {
    setLoadingingTasks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/onboarding/${onboardingId}/tasks`, {
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
      const res = await fetch("/api/workforce/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create onboarding");
      }

      toast.success("Onboarding created successfully");
      setShowModal(false);
      setForm({ employee_id: "", program_id: "", buddy_id: "" });
      fetchOnboardings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/onboarding/tasks/${taskId}`, {
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
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-sm text-gray-500">Track new employee onboarding progress</p>
        </div>
        {isAdminUser && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Onboarding
          </Button>
        )}
      </div>

      {onboardings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No onboarding programs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {onboardings.map((ob) => (
            <Card
              key={ob.id}
              className={`border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${selectedId === ob.id ? "ring-2 ring-brand-primary" : ""}`}
              onClick={() => {
                setSelectedId(ob.id);
                fetchTasks(ob.id);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{ob.employee?.full_name || "Unknown"}</span>
                  <Badge className={STATUS_STYLES[ob.status] || STATUS_STYLES.in_progress}>
                    {ob.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="text-xs text-gray-500">
                  {ob.employee?.designation} • {ob.employee?.department}
                </p>
                {ob.buddy && (
                  <p className="text-xs text-gray-600">Buddy: {ob.buddy.full_name}</p>
                )}
                {ob.program && (
                  <p className="text-xs text-gray-600">Program: {ob.program.name}</p>
                )}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-brand-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, ob.progress || 0))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{ob.progress || 0}% complete</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Tasks</CardTitle>
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
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
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
                    <Badge variant="outline" className={task.status === "completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">New Onboarding</h2>
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
                <Label>Buddy (Optional)</Label>
                <Select
                  value={form.buddy_id}
                  onValueChange={v => setForm({ ...form, buddy_id: v === "_none_" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buddy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">None</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Onboarding"}
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
