"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BugReport, SEVERITY_COLORS, STATUS_COLORS } from "@/types/testing";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "ui", label: "UI" },
  { value: "performance", label: "Performance" },
  { value: "crash", label: "Crash" },
  { value: "feature", label: "Feature" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severity" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function BugsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/testing/bugs?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch bugs");
      const json = await res.json();
      setBugs(json.data || []);
    } catch {
      toast.error("Failed to load bugs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking) fetchBugs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, categoryFilter, severityFilter, statusFilter, searchQuery]);

  const handleSearch = () => {
    fetchBugs();
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
          <h1 className="text-2xl font-bold">Bug Reports</h1>
          <p className="text-gray-500">Total: {bugs.length} reports</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search bugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>Search</Button>
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading bugs...</div>
        ) : bugs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No bug reports found</div>
        ) : (
          bugs.map((bug) => (
            <Card key={bug.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{bug.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={SEVERITY_COLORS[bug.severity]}>
                      {bug.severity}
                    </Badge>
                    <Badge className={STATUS_COLORS[bug.status]}>
                      {bug.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3 line-clamp-3">
                  {bug.description || "No description"}
                </p>
                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <span>Category: {bug.category}</span>
                  <span>
                    {new Date(bug.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
{bug.tester && (
                  <p className="text-sm text-gray-600 mb-3">
                    Reporter: {bug.tester.full_name || bug.tester.email}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}