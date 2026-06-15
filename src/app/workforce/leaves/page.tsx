"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { LeaveType, LeaveRequest } from "@/types/workforce";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function LeavesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [leaves, setLeaves] = useState<(LeaveRequest & { employee?: { full_name: string; department: string } })[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    leave_type: "casual" as LeaveType,
    start_date: "",
    end_date: "",
    reason: "",
  });

  const { isAdmin: checkAdmin } = usePermissions();
  const canApprove = checkAdmin(profile?.role || "");

  useEffect(() => {
    if (!profile) return;
    fetchLeaves();
  }, [profile, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLeaves = async () => {
    setFetching(true);
    const { data: { session } } = await supabase.auth.getSession();
    const url = search ? `/api/workforce/hcm/leaves?employee_id=${search}` : "/api/workforce/hcm/leaves";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setLeaves(json.leaves || []);
    setFetching(false);
  };

  const handleApprove = async (leaveId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/hcm/leaves/${leaveId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      toast.success("Leave approved");
      fetchLeaves();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to approve");
    }
  };

  const handleReject = async (leaveId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/hcm/leaves/${leaveId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      toast.success("Leave rejected");
      fetchLeaves();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to reject");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/hcm/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to apply leave");
      toast.success("Leave application submitted!");
      setShowModal(false);
      setForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
      fetchLeaves();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply leave");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" /></div>;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-gray-500">
            {canApprove ? "View and approve leave requests" : "Apply and track your leave requests"}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>📅 Apply Leave</Button>
      </div>

      {canApprove && (
        <Input
          placeholder="Search by employee ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      )}

      {fetching ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📅</p>
          <p className="font-semibold text-gray-600">No leave requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => (
            <Card key={leave.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  {canApprove && leave.employee && (
                    <p className="font-semibold text-gray-900">
                      {leave.employee.full_name}
                      <span className="text-xs text-gray-500 ml-2">({leave.employee.department})</span>
                    </p>
                  )}
                  <p className="font-semibold">{leave.leave_type.replace(/_/g, " ")}</p>
                  <p className="text-sm text-gray-500">{leave.start_date} → {leave.end_date}</p>
                  {leave.reason && <p className="text-xs text-gray-400 mt-1">{leave.reason}</p>}
                </div>
<div className="flex items-center gap-2">
                   <Badge className={STATUS_COLORS[leave.status]}>{leave.status}</Badge>
                   {canApprove && leave.status === "pending" && (
                     <div className="flex gap-1">
                       <Button size="sm" onClick={() => handleApprove(leave.id)}>Approve</Button>
                       <Button size="sm" variant="destructive" onClick={() => handleReject(leave.id)}> ✕ </Button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Apply for Leave</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Leave Type *</Label>
                <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value as LeaveType })} className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm">
                  {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date *</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm" rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Submitting..." : "Apply Leave"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}