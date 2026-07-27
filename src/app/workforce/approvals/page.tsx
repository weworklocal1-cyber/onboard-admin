"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, FileText, ClipboardList, Receipt } from "lucide-react";

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  employee?: { full_name: string; department: string };
}

interface Expense {
  id: string;
  employee_id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  employee?: { full_name: string; department: string };
}

interface Task {
  id: string;
  title: string;
  status: string;
  requires_approval: boolean;
  created_at: string;
  creator?: { full_name: string };
}

export default function ApprovalsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("leaves");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const isManager = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;

  useEffect(() => {
    if (!profile || !isManager) return;
    fetchApprovals();
  }, [profile, isManager]);

  const fetchApprovals = async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      const [leavesRes, expensesRes, tasksRes] = await Promise.all([
        fetch("/api/workforce/hcm/leaves?status=pending", { headers }),
        fetch("/api/workforce/expenses?status=pending", { headers }),
        fetch("/api/workforce/tasks?requires_approval=true", { headers }),
      ]);

      if (leavesRes.ok) {
        const json = await leavesRes.json();
        setLeaves(json.leaveRequests || []);
      }
      if (expensesRes.ok) {
        const json = await expensesRes.json();
        setExpenses(json.expenses || []);
      }
      if (tasksRes.ok) {
        const json = await tasksRes.json();
        setTasks(json.tasks || []);
      }
    } catch (err) {
      console.error("Error fetching approvals:", err);
      toast.error("Failed to load approvals");
    } finally {
      setFetching(false);
    }
  };

  const handleApprove = async (type: "leave" | "expense" | "task", id: string) => {
    setSubmitting(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      };

      let res: Response;
      if (type === "leave") {
        res = await fetch(`/api/workforce/hcm/leaves/${id}/approve`, { method: "PATCH", headers });
      } else if (type === "expense") {
        res = await fetch(`/api/workforce/expenses/${id}/approve`, { method: "PATCH", headers });
      } else {
        res = await fetch(`/api/workforce/tasks/${id}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ approved: true, approval_notes: "", quality_flag: "clean" }),
        });
      }

      if (res.ok) {
        toast.success("Approved successfully");
        fetchApprovals();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve");
    }
    setSubmitting(null);
  };

  const handleReject = async (type: "leave" | "expense" | "task", id: string) => {
    const reason = rejectReason[id] || "";
    setSubmitting(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      };

      let res: Response;
      if (type === "leave") {
        res = await fetch(`/api/workforce/hcm/leaves/${id}/reject`, {
          method: "POST",
          headers,
          body: JSON.stringify({ rejection_reason: reason || "No reason provided" }),
        });
      } else if (type === "expense") {
        res = await fetch(`/api/workforce/expenses/${id}/reject`, {
          method: "POST",
          headers,
          body: JSON.stringify({ rejection_reason: reason || "No reason provided" }),
        });
      } else {
        res = await fetch(`/api/workforce/tasks/${id}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ approved: false, approval_notes: reason || "No reason provided", quality_flag: "needs_rework" }),
        });
      }

      if (res.ok) {
        toast.success("Rejected successfully");
        setRejectReason(prev => { const next = { ...prev }; delete next[id]; return next; });
        fetchApprovals();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to reject");
      }
    } catch {
      toast.error("Failed to reject");
    }
    setSubmitting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile || !isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500">You don&apos;t have permission to view approvals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = leaves.length + expenses.length + tasks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Approval Queue</h1>
        <p className="text-gray-500 mt-1">
          Review and process pending requests from your team.
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
              <Clock className="h-4 w-4" /> {pendingCount} pending
            </span>
          )}
        </p>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="leaves" className="gap-2">
              <FileText className="h-4 w-4" /> Leaves
              {leaves.length > 0 && <Badge variant="secondary" className="ml-1">{leaves.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" /> Expenses
              {expenses.length > 0 && <Badge variant="secondary" className="ml-1">{expenses.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Tasks
              {tasks.length > 0 && <Badge variant="secondary" className="ml-1">{tasks.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaves" className="space-y-4">
            {leaves.length === 0 ? (
              <EmptyState title="No pending leaves" description="All leave requests have been processed." />
            ) : (
              <div className="grid gap-4">
                {leaves.map((leave) => (
                  <Card key={leave.id} className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">{leave.employee?.full_name || "Employee"}</p>
                            <Badge variant="outline" className="text-[10px]">{leave.employee?.department || ""}</Badge>
                            <Badge className="bg-amber-100 text-amber-700 text-[10px] font-medium capitalize">{leave.leave_type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            📅 {format(new Date(leave.start_date), "MMM d, yyyy")} — {format(new Date(leave.end_date), "MMM d, yyyy")}
                          </p>
                          {leave.reason && <p className="text-xs text-gray-500 italic">Reason: {leave.reason}</p>}
                          <p className="text-[10px] text-gray-400 mt-1">Submitted on {format(new Date(leave.created_at), "MMM d, yyyy 'at' hh:mm a")}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove("leave", leave.id)}
                            disabled={submitting === leave.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject("leave", leave.id)}
                            disabled={submitting === leave.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            {expenses.length === 0 ? (
              <EmptyState title="No pending expenses" description="All expense claims have been processed." />
            ) : (
              <div className="grid gap-4">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">{expense.employee?.full_name || "Employee"}</p>
                            <Badge variant="outline" className="text-[10px]">{expense.employee?.department || ""}</Badge>
                            <Badge className="bg-blue-100 text-blue-700 text-[10px] font-medium capitalize">{expense.category}</Badge>
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-1">₹{expense.amount.toFixed(2)}</p>
                          {expense.description && <p className="text-xs text-gray-600 mb-1">{expense.description}</p>}
                          <p className="text-[10px] text-gray-400">
                            {format(new Date(expense.date), "MMM d, yyyy")} · Submitted on {format(new Date(expense.created_at), "MMM d, yyyy 'at' hh:mm a")}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove("expense", expense.id)}
                            disabled={submitting === expense.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <div className="w-32">
                            <Textarea
                              placeholder="Rejection reason (optional)"
                              value={rejectReason[expense.id] || ""}
                              onChange={(e) => setRejectReason(prev => ({ ...prev, [expense.id]: e.target.value }))}
                              className="text-xs h-8 resize-none"
                              disabled={submitting === expense.id}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject("expense", expense.id)}
                            disabled={submitting === expense.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {tasks.length === 0 ? (
              <EmptyState title="No pending task approvals" description="All completed tasks with approval requirements have been reviewed." />
            ) : (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <Card key={task.id} className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <Badge className="bg-amber-100 text-amber-700 text-[10px] font-medium">Requires Approval</Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Submitted by {task.creator?.full_name || "Employee"} on {format(new Date(task.created_at), "MMM d, yyyy 'at' hh:mm a")}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove("task", task.id)}
                            disabled={submitting === task.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <div className="w-32">
                            <Textarea
                              placeholder="Rejection reason (optional)"
                              value={rejectReason[task.id] || ""}
                              onChange={(e) => setRejectReason(prev => ({ ...prev, [task.id]: e.target.value }))}
                              className="text-xs h-8 resize-none"
                              disabled={submitting === task.id}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject("task", task.id)}
                            disabled={submitting === task.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-900 mb-1">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}
