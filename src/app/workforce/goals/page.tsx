"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Target, TrendingUp, Trash2, Edit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Goal = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  quarter: string;
  year: number;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  alignment: string;
  parent_goal_id: string | null;
  employee?: {
    id: string;
    full_name: string;
    department: string | null;
  };
  key_results?: KeyResult[];
};

type KeyResult = {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
};

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const ALIGNMENTS = [
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
  { value: "company", label: "Company" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

export default function GoalsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [quarterFilter, setQuarterFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(String(CURRENT_YEAR));

  const isManager = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;

  const [form, setForm] = useState({
    employee_id: "",
    title: "",
    description: "",
    quarter: `Q${Math.floor((new Date().getMonth() + 3) / 3)}`,
    year: String(CURRENT_YEAR),
    target_value: "",
    unit: "number",
    alignment: "individual",
    parent_goal_id: "",
  });

  const [keyResultForm, setKeyResultForm] = useState({
    goal_id: "",
    title: "",
    description: "",
    target_value: "",
    unit: "number",
  });

  useEffect(() => {
    if (!profile) return;
    fetchGoals();
  }, [profile, quarterFilter, yearFilter]);

  const fetchGoals = async () => {
    setLoadingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (quarterFilter && quarterFilter !== "all") params.set("quarter", quarterFilter);
      if (yearFilter) params.set("year", yearFilter);
      if (!isManager) params.set("employee_id", profile!.id);

      const res = await fetch(`/api/workforce/goals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch goals");
      }

      const data = await res.json();
      setGoals(data.goals || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          year: parseInt(form.year),
          target_value: parseFloat(form.target_value) || 0,
          employee_id: isManager ? form.employee_id || profile!.id : profile!.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create goal");
      }

      toast.success("Goal created");
      setShowModal(false);
      setForm({
        employee_id: "",
        title: "",
        description: "",
        quarter: `Q${Math.floor((new Date().getMonth() + 3) / 3)}`,
        year: String(CURRENT_YEAR),
        target_value: "",
        unit: "number",
        alignment: "individual",
        parent_goal_id: "",
      });
      fetchGoals();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyResultForm.title.trim() || !keyResultForm.goal_id) {
      toast.error("Title and goal are required");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/goals/key-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...keyResultForm,
          target_value: parseFloat(keyResultForm.target_value) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add key result");
      }

      toast.success("Key result added");
      setShowKeyResultModal(false);
      setKeyResultForm({ goal_id: "", title: "", description: "", target_value: "", unit: "number" });
      fetchGoals();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add key result");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGoalProgress = async (goalId: string, currentValue: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ current_value: currentValue }),
      });

      if (res.ok) {
        toast.success("Progress updated");
        fetchGoals();
      } else {
        toast.error("Failed to update progress");
      }
    } catch {
      toast.error("Failed to update progress");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Delete this goal and all its key results?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/goals/${goalId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.ok) {
        toast.success("Goal deleted");
        fetchGoals();
      } else {
        toast.error("Failed to delete goal");
      }
    } catch {
      toast.error("Failed to delete goal");
    }
  };

  const getProgress = (goal: Goal) => {
    if (goal.target_value === 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals & OKRs</h1>
          <p className="text-sm text-gray-500">Track objectives and key results across the organization</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Goal
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={quarterFilter} onValueChange={setQuarterFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quarters</SelectItem>
            {QUARTERS.map((q) => (
              <SelectItem key={q} value={q}>{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-1">No goals found</p>
            <p className="text-sm text-gray-500">Create your first goal to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            return (
              <Card key={goal.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-brand-primary" />
                        <span className="truncate">{goal.title}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {goal.employee?.full_name || "Unassigned"} • {goal.quarter} {goal.year} • {goal.alignment}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`${getStatusColor(goal.status)} text-[10px] font-medium`}>
                        {goal.status}
                      </Badge>
                      {isManager && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goal.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{goal.current_value} {goal.unit}</span>
                      <span>Target: {goal.target_value} {goal.unit}</span>
                    </div>
                    {isManager && (
                      <div className="flex gap-2 pt-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={goal.current_value}
                          onChange={(e) => handleUpdateGoalProgress(goal.id, parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                          placeholder="Update progress"
                        />
                      </div>
                    )}
                  </div>

                  {goal.key_results && goal.key_results.length > 0 && (
                    <div className="space-y-2 pt-3 border-t">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Key Results</p>
                      {goal.key_results.map((kr) => {
                        const krProgress = kr.target_value === 0 ? 0 : Math.min(100, Math.round((kr.current_value / kr.target_value) * 100));
                        return (
                          <div key={kr.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-gray-900">{kr.title}</p>
                              <span className="text-[10px] text-gray-500">{krProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${krProgress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {kr.current_value} / {kr.target_value} {kr.unit}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setKeyResultForm({ ...keyResultForm, goal_id: goal.id });
                        setShowKeyResultModal(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Key Result
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Create New Goal</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter goal title"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this goal"
                  rows={3}
                />
              </div>
              {isManager && (
                <div className="space-y-1.5">
                  <Label>Assignee</Label>
                  <select
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Self</option>
                  </select>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Quarter *</Label>
                  <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year *</Label>
                  <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Target Value *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.target_value}
                    onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="currency">Currency (₹)</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Alignment</Label>
                <Select value={form.alignment} onValueChange={(v) => setForm({ ...form, alignment: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENTS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Creating..." : "Create Goal"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showKeyResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add Key Result</h2>
            </div>
            <form onSubmit={handleAddKeyResult} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={keyResultForm.title}
                  onChange={(e) => setKeyResultForm({ ...keyResultForm, title: e.target.value })}
                  placeholder="Enter key result"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={keyResultForm.description}
                  onChange={(e) => setKeyResultForm({ ...keyResultForm, description: e.target.value })}
                  placeholder="How will we measure success?"
                  rows={2}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Target Value *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={keyResultForm.target_value}
                    onChange={(e) => setKeyResultForm({ ...keyResultForm, target_value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select value={keyResultForm.unit} onValueChange={(v) => setKeyResultForm({ ...keyResultForm, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="currency">Currency (₹)</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Adding..." : "Add Key Result"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowKeyResultModal(false)}>
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
