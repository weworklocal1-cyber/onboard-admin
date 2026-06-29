"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { TestingStats } from "@/types/testing";

export default function TestingDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<TestingStats | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (authChecking) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/testing/stats", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setStats(json.data);
        }
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, [authChecking, supabase]);

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Testing Dashboard</h1>
        <p className="text-gray-500">Overview of testing program metrics</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading stats...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Testers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_testers || 0}</div>
              <p className="text-xs text-gray-500 mt-1">{stats?.active_testers || 0} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.bug_reports || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                Critical: {stats?.bugs_by_severity?.critical || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.feature_requests || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                Pending: {stats?.requests_by_status?.submitted || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.average_rating ? stats.average_rating.toFixed(1) : "—"}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats?.feedback_count || 0} responses</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}