"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading || !profile) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/workforce/audit-logs", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to load audit logs");

        const data = await res.json();
        if (active) {
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [profile, authLoading, supabase]);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.table_name.toLowerCase().includes(q) ||
      (log.record_id || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">
          Track important actions and changes across the platform.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Input
              placeholder="Search action, table, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-72"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No audit logs found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                    <Badge variant="outline" className="text-[10px]">
                      {log.table_name}
                    </Badge>
                    {log.record_id && (
                      <code className="rounded bg-gray-100 px-1.5 py-0.5">
                        {log.record_id}
                      </code>
                    )}
                  </div>
                  {(log.old_values || log.new_values) && (
                    <div className="grid gap-2 sm:grid-cols-2 text-[10px]">
                      {log.old_values && (
                        <div className="rounded-lg bg-gray-50 p-2">
                          <p className="mb-1 font-semibold text-gray-600">Before</p>
                          <pre className="whitespace-pre-wrap break-all text-gray-700">
                            {JSON.stringify(log.old_values)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div className="rounded-lg bg-gray-50 p-2">
                          <p className="mb-1 font-semibold text-gray-600">After</p>
                          <pre className="whitespace-pre-wrap break-all text-gray-700">
                            {JSON.stringify(log.new_values)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
