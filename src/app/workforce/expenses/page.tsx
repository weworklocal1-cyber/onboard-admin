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
import { Plus, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";

type ExpenseStatus = "pending" | "approved" | "rejected";

const EXPENSE_CATEGORIES = [
  'travel',
  'meals',
  'accommodation',
  'office_supplies',
  'equipment',
  'training',
  'marketing',
  'utilities',
  'other',
];

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel",
  meals: "Meals",
  accommodation: "Accommodation",
  office_supplies: "Office Supplies",
  equipment: "Equipment",
  training: "Training",
  marketing: "Marketing",
  utilities: "Utilities",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ExpensesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { isAdmin } = usePermissions();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingData, setLoadingingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    category: "other",
    expense_date: new Date().toISOString().split("T")[0],
    employee_id: "",
  });

  const isAdminUser = isAdmin(profile?.role || "");

  useEffect(() => {
    if (!profile) return;
    fetchExpenses();
    if (isAdminUser) {
      fetchEmployees();
    }
  }, [profile, statusFilter]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchExpenses = async () => {
    setLoadingingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = new URL("/api/workforce/expenses", window.location.origin);
      if (isAdminUser && form.employee_id) {
        url.searchParams.set("employee_id", form.employee_id);
      }
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch expenses");
      }

      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoadingingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) {
      toast.error("Title and amount are required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          employee_id: isAdminUser && form.employee_id ? form.employee_id : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit expense");
      }

      toast.success("Expense submitted successfully");
      setShowModal(false);
      setForm({
        title: "",
        description: "",
        amount: "",
        category: "other",
        expense_date: new Date().toISOString().split("T")[0],
        employee_id: "",
      });
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (expenseId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }

      toast.success("Expense approved");
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve expense");
    }
  };

  const handleReject = async (expenseId: string) => {
    const reason = prompt("Rejection reason (optional):");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/expenses/${expenseId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ rejection_reason: reason }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }

      toast.success("Expense rejected");
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject expense");
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
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-gray-500">
            {isAdminUser ? "Review and manage expenses" : "Submit and track your expenses"}
          </p>
        </div>
        {!isAdminUser && (
          <Button onClick={() => setShowModal(true)}>➕ New Expense</Button>
        )}
      </div>

      {isAdminUser && (
        <div className="flex items-center gap-3">
          <Label>Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No expenses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{expense.title}</h3>
                      <Badge className={STATUS_COLORS[expense.status] || STATUS_COLORS.pending}>
                        {expense.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{expense.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span className="font-semibold text-brand-primary">₹{Number(expense.amount).toLocaleString()}</span>
                      <span className="capitalize">{CATEGORY_LABELS[expense.category] || expense.category}</span>
                      <span>{expense.expense_date}</span>
                      <span className="text-gray-400">
                        {expense.employee?.full_name}
                      </span>
                    </div>
                    {expense.approver && (
                      <p className="text-xs text-gray-400 mt-1">
                        Approved by: {expense.approver.full_name}
                      </p>
                    )}
                    {expense.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">
                        Reason: {expense.rejection_reason}
                      </p>
                    )}
                  </div>
                  {isAdminUser && expense.status === "pending" && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprove(expense.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(expense.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">New Expense</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm({ ...form, expense_date: e.target.value })}
                  required
                />
              </div>
              {isAdminUser && (
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v === "_none_" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee (defaults to you)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Myself</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Expense"}
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
