"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type BurndownPoint = {
  date: string;
  day: number;
  ideal: number;
  actual: number;
};

export default function BurndownChart() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const [sprints, setSprints] = useState<{ id: string; name: string; project_id: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoadinging] = useState(true);

  const isLeadOrAdmin = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;

  useEffect(() => {
    if (authLoading || !profile) return;
    fetchLookups();
  }, [profile, authLoading]);

  const fetchLookups = async () => {
    try {
      const [sprintsRes, projectsRes] = await Promise.all([
        fetch("/api/workforce/sprints"),
        fetch("/api/workforce/projects"),
      ]);

      if (sprintsRes.ok) {
        const data = await sprintsRes.json();
        setSprints(data.sprints || []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!selectedSprintId) {
      setData(null);
      setLoadinging(false);
      return;
    }
    let active = true;
    setLoadinging(true);

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/workforce/tasks/burndown?sprint_id=${selectedSprintId}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load burndown");
        }

        const json = await res.json();
        if (active) {
          setData(json);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load burndown");
      } finally {
        if (active) setLoadinging(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [selectedSprintId, supabase]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  if (!isLeadOrAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sprint Burndown</h1>
        <p className="text-gray-500">Track sprint progress and remaining work</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Sprint:</Label>
            <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Sprint</p>
              <p className="text-lg font-bold">{data.sprint?.name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Total Tasks</p>
              <p className="text-lg font-bold">{data.totalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold">{data.completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Est. Hours</p>
              <p className="text-lg font-bold">{data.totalEstimated.toFixed(1)}h</p>
            </CardContent>
          </Card>
        </div>
      )}

      {data && data.days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Burndown Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <BurndownChartSVG data={data.days} />
          </CardContent>
        </Card>
      )}

      {!data && selectedSprintId && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-gray-400 text-xl font-bold">📊</div>
            <p className="text-gray-500">Select a sprint to view burndown</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BurndownChartSVG({ data }: { data: BurndownPoint[] }) {
  const width = 800;
  const height = 400;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => Math.max(d.ideal, d.actual)), 1);
  const xScale = (i: number) => padding.left + (i / (data.length - 1 || 1)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - (v / maxValue) * chartHeight;

  const idealPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.ideal)}`).join(" ");
  const actualPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.actual)}`).join(" ");

  const xTicks = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 7)) === 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px]">
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const value = maxValue * (1 - tick);
            const y = yScale(value);
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E5E7EB" strokeDasharray="4 4" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-500">
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {xTicks.map((d, i) => {
            const idx = data.indexOf(d);
            const x = xScale(idx);
            return (
              <g key={d.date}>
                <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#E5E7EB" />
                <text x={x} y={height - padding.bottom + 16} textAnchor="middle" className="text-[10px] fill-gray-500">
                  {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
              </g>
            );
          })}
        </g>

        <path d={idealPath} fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="6 4" />
        <path d={actualPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" />

        {data.map((d, i) => (
          <circle key={d.date} cx={xScale(i)} cy={yScale(d.actual)} r="4" fill="#3B82F6" stroke="white" strokeWidth="2" />
        ))}

        <text x={padding.left} y={padding.top - 8} className="text-xs font-medium fill-gray-700">
          Ideal
        </text>
        <text x={padding.left + 100} y={padding.top - 8} className="text-xs font-medium fill-blue-600">
          Actual
        </text>
      </svg>
    </div>
  );
}
