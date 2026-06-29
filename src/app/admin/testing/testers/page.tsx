"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Tester = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: "pending" | "approved" | "blocked";
  assigned_version: string | null;
  joined_at: string;
  last_login: string | null;
  feedback_count: number;
  bugs_reported: number;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "blocked", label: "Blocked" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
};

export default function TestersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [testers, setTesters] = useState<Tester[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingTester, setEditingTester] = useState<Tester | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin");
        return;
      }

      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.push("/admin");
        return;
      }

      setAuthChecking(false);
    };
    checkAuth();
  }, [router, supabase]);

  const fetchTesters = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/testing/testers?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch testers");
      const json = await res.json();
      setTesters(json.data || []);
    } catch {
      toast.error("Failed to load testers");
    } finally {
setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking) fetchTesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, statusFilter, searchQuery]);

  const handleSearch = () => {
    fetchTesters();
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTester) return;

    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/testing/testers/${editingTester.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: editStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update tester");
      }

      toast.success("Tester status updated");
      setEditingTester(null);
      fetchTesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tester");
    } finally {
      setUpdating(false);
    }
  };

  if (authChecking) {
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
          <h1 className="text-2xl font-bold">Tester Management</h1>
          <p className="text-gray-500">Total: {testers.length} testers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Testers</CardTitle>
          </CardHeader>
          <CardContent>
<div className="text-3xl font-bold">
               {testers.filter(t => t.status === "approved").length}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {testers.reduce((acc, t) => acc + t.feedback_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bugs Reported</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {testers.reduce((acc, t) => acc + t.bugs_reported, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search testers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>Search</Button>
        </div>
        <div>
          <Select
            placeholder="All Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading testers...</div>
        ) : testers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No testers found</div>
        ) : (
          testers.map((tester) => (
            <Card key={tester.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {tester.full_name || tester.email}
                  </CardTitle>
                  <Badge className={STATUS_COLORS[tester.status]}>
                    {tester.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{tester.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{tester.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Feedback</p>
                    <p className="font-medium">{tester.feedback_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bugs Reported</p>
                    <p className="font-medium">{tester.bugs_reported}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    Joined:{" "}
                    {new Date(tester.joined_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTester(tester);
                      setEditStatus(tester.status);
                    }}
                  >
                    Edit Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editingTester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Update Tester Status</h2>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Name</p>
                <p className="text-gray-900">{editingTester.full_name || editingTester.email}</p>
              </div>

              <div>
                <Select
                  label="Status"
                  options={STATUS_OPTIONS.filter(o => o.value !== "all")}
                  value={editStatus}
                  onValueChange={setEditStatus}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTester(null)}
                >
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