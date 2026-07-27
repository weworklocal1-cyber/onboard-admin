"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Play, X, Check, AlertTriangle } from "lucide-react";

type PIP = {
  id: string;
  employee_id: string;
  created_by: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  outcome: string;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: { full_name: string; department: string | null };
  milestones?: { id: string; title: string; description: string; due_date: string; status: string }[];
};

type Flag = {
  id: string;
  employee_id: string;
  rule_name: string;
  description: string;
  current_value: number;
  threshold_value: number;
  threshold_unit: string;
  status: string;
  review_notes: string | null;
  employee?: { full_name: string; department: string | null };
};

type Rule = {
  id: string;
  rule_name: string;
  description: string;
  metric_type: string;
  threshold_value: number;
  threshold_unit: string;
  comparison: string;
  window_days: number;
  is_active: boolean;
};

export default function PerformanceImprovementPlansPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [plans, setPlans] = useState<PIP[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    description: "",
    metric_type: "attendance_rate",
    threshold_value: 75,
    threshold_unit: "percent",
    comparison: "less_than",
    window_days: 30,
  });
  const [form, setForm] = useState({
    employee_id: "",
    title: "",
    description: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    milestones: [{ title: "", description: "", due_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") }],
  });

  const isFounderOrAdmin = profile?.role && ['founder', 'super_admin', 'hr_admin'].includes(profile.role);

  useEffect(() => {
    if (!profile) return;
    fetchPlans();
    if (isFounderOrAdmin) {
      fetchFlags();
      fetchRules();
      fetchEmployees();
    }
  }, [profile, isFounderOrAdmin]);

  const fetchPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/performance-improvement-plans", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch PIPs");
      }
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load PIPs");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchFlags = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/pip-criteria/flags", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch flags");
      const data = await res.json();
      setFlags(data.flags || []);
    } catch (err: any) {
      console.error("Failed to load flags:", err);
    }
  };

  const fetchRules = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/pip-criteria/rules", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch (err: any) {
      console.error("Failed to load rules:", err);
    }
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/performance-improvement-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create PIP");
      }

      toast.success("PIP created successfully");
      setShowForm(false);
      setForm({
        employee_id: "",
        title: "",
        description: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        milestones: [{ title: "", description: "", due_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") }],
      });
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to create PIP");
    } finally {
      setSaving(false);
    }
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/pip-criteria/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(ruleForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create rule");
      }

      toast.success("Rule created successfully");
      setShowRuleForm(false);
      setRuleForm({
        rule_name: "",
        description: "",
        metric_type: "attendance_rate",
        threshold_value: 75,
        threshold_unit: "percent",
        comparison: "less_than",
        window_days: 30,
      });
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || "Failed to create rule");
    } finally {
      setSavingRule(false);
    }
  };

  const handleRunCriteria = async () => {
    if (!isFounderOrAdmin) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/pip-criteria/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          employee_ids: employees.map(e => e.id),
          rule_ids: rules.filter(r => r.is_active).map(r => r.id)
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to run criteria");
      }

      const data = await res.json();
      toast.success(data.message || `Created ${data.flagsCreated} new flags`);
      fetchFlags();
    } catch (err: any) {
      toast.error(err.message || "Failed to run criteria");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewFlag = async (flagId: string, status: 'dismissed' | 'converted_to_pip' | 'escalated') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/pip-criteria/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ flag_id: flagId, status, review_notes: reviewNotes }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to review flag");
      }

      toast.success(`Flag ${status === 'dismissed' ? 'dismissed' : status === 'converted_to_pip' ? 'converted to PIP' : 'escalated'}`);
      setReviewingId(null);
      setReviewNotes("");
      fetchFlags();
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to review flag");
    }
  };

  const addMilestone = () => {
    setForm({
      ...form,
      milestones: [...form.milestones, { title: "", description: "", due_date: form.end_date }],
    });
  };

  const updateMilestone = (idx: number, field: string, value: string) => {
    setForm({
      ...form,
      milestones: form.milestones.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    });
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/pip-criteria/rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ id: ruleId, is_active: !isActive }),
      });

      if (!res.ok) throw new Error("Failed to update rule");
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || "Failed to update rule");
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

  if (!isFounderOrAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Improvement Plans</h1>
          <p className="text-sm text-gray-500">Manage PIPs and auto-flagging criteria</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRunCriteria} disabled={saving || rules.filter(r => r.is_active).length === 0}>
            <Play className="h-4 w-4 mr-1" /> Run Criteria Check
          </Button>
          <Button onClick={() => setShowRuleForm(!showRuleForm)} variant="outline">
            <Plus className="h-4 w-4 mr-1" /> {showRuleForm ? "Cancel" : "New Rule"}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> New PIP
          </Button>
        </div>
      </div>

      {showRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create PIP Criteria Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRuleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Rule Name</Label>
                  <Input value={ruleForm.rule_name} onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Metric Type</Label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={ruleForm.metric_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, metric_type: e.target.value })}
                  >
                    <option value="attendance_rate">Attendance Rate (%)</option>
                    <option value="absent_days">Absent Days (count)</option>
                    <option value="late_days">Late Days (count)</option>
                    <option value="overdue_tasks">Overdue Tasks (count)</option>
                    <option value="blocked_tasks">Blocked Tasks (count)</option>
                    <option value="missed_updates">Missed Updates (count)</option>
                    <option value="unresolved_blockers">Unresolved Blockers (count)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} rows={2} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Threshold Value</Label>
                  <Input type="number" value={ruleForm.threshold_value} onChange={(e) => setRuleForm({ ...ruleForm, threshold_value: Number(e.target.value) })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={ruleForm.threshold_unit}
                    onChange={(e) => setRuleForm({ ...ruleForm, threshold_unit: e.target.value })}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="days">Days</option>
                    <option value="count">Count</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Comparison</Label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={ruleForm.comparison}
                    onChange={(e) => setRuleForm({ ...ruleForm, comparison: e.target.value })}
                  >
                    <option value="less_than">Less Than</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than_or_equal">Less Than or Equal</option>
                    <option value="greater_than_or_equal">Greater Than or Equal</option>
                    <option value="equals">Equals</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Window (days)</Label>
                  <Input type="number" value={ruleForm.window_days} onChange={(e) => setRuleForm({ ...ruleForm, window_days: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingRule} className="flex-1">{savingRule ? "Creating..." : "Create Rule"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowRuleForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Criteria Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{rule.rule_name}</h4>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>{rule.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{rule.description || "No description"}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {rule.metric_type} {rule.comparison.replace(/_/g, " ")} {rule.threshold_value}{rule.threshold_unit} in {rule.window_days} days
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant={rule.is_active ? "destructive" : "default"}
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                >
                  {rule.is_active ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No criteria rules defined. Create one above.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isFounderOrAdmin && flags.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Pending Auto-Flags ({flags.filter(f => f.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flags.filter(f => f.status === 'pending').map((flag) => (
                <div key={flag.id} className="p-5 bg-white border border-amber-200 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm text-gray-900">{flag.rule_name}</h4>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          {flag.rule_name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Employee:</span>
                          <span className="text-sm font-semibold text-gray-900">{flag.employee?.full_name}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">{flag.employee?.department || "N/A"}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3 mb-3">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Actual Value</p>
                          <p className="text-lg font-bold text-gray-900">{flag.current_value}{flag.threshold_unit}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Threshold</p>
                          <p className="text-lg font-bold text-gray-700">{flag.threshold_value}{flag.threshold_unit}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <p className="text-xs text-red-600 mb-1">Status</p>
                          <p className="text-sm font-semibold text-red-700">Breach Detected</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">{flag.description}</p>
                    </div>
                  </div>
                  {reviewingId === flag.id ? (
                    <div className="mt-4 space-y-2">
                      <Textarea 
                        placeholder="Review notes (optional)" 
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleReviewFlag(flag.id, 'dismissed')}>
                          <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReviewFlag(flag.id, 'escalated')}>
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate
                        </Button>
                        <Button size="sm" onClick={() => handleReviewFlag(flag.id, 'converted_to_pip')}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Convert to PIP
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setReviewingId(null); setReviewNotes(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Button size="sm" onClick={() => setReviewingId(flag.id)}>Review</Button>
                    </div>
                  )}
                </div>
              ))}
              {flags.filter(f => f.status === 'pending').length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No pending flags to review.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && isFounderOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Create New PIP</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Milestones</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addMilestone}>Add Milestone</Button>
                </div>
                {form.milestones.map((m, idx) => (
                  <div key={idx} className="grid gap-2 md:grid-cols-3 p-3 border rounded-lg">
                    <Input placeholder="Milestone title" value={m.title} onChange={(e) => updateMilestone(idx, "title", e.target.value)} required />
                    <Input type="date" value={m.due_date} onChange={(e) => updateMilestone(idx, "due_date", e.target.value)} required />
                    <Input placeholder="Description (optional)" value={m.description} onChange={(e) => updateMilestone(idx, "description", e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? "Creating..." : "Create PIP"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-gray-500">No PIPs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const statusColor = plan.status === "active" ? "bg-blue-100 text-blue-700" : plan.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700";
            const outcomeColor = plan.outcome === "successful" ? "bg-green-100 text-green-700" : plan.outcome === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
            return (
              <Card key={plan.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {plan.employee?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{plan.employee?.full_name || "Unknown Employee"}</h4>
                          <p className="text-xs text-gray-500">{plan.employee?.department || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm text-gray-800">{plan.title}</h4>
                        <Badge className={statusColor}>{plan.status}</Badge>
                        <Badge variant="outline" className={outcomeColor}>{plan.outcome}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(plan.start_date), "MMM d, yyyy")} - {format(new Date(plan.end_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{plan.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
