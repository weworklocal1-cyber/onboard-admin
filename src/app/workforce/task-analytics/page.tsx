"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { TaskAnalytics, TaskPriority, TASK_STATUS_COLORS, PRIORITY_COLORS } from "@/types/workforce";

export default function TaskAnalyticsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
  const [fetching, setFetching] = useState(true);
  const [filters, setFilters] = useState({
    department: "",
    date_from: "",
    date_to: "",
  });
  const [departments, setDepartments] = useState<string[]>([]);

  const isLeadOrAdmin = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;

  useEffect(() => {
    if (!profile) return;
    fetchDepartments();
    fetchAnalytics();
  }, [profile, filters]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("name")
      .order("name");
    if (data) {
      setDepartments(data.map(d => d.name));
    }
  };

  const fetchAnalytics = async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (filters.department) params.set("department", filters.department);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/analytics?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setAnalytics(json);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      toast.error("Failed to load analytics");
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
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
        <h1 className="text-2xl font-bold">Task Analytics</h1>
        <p className="text-gray-500">Task completion rates, cycle times, and team productivity</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <select
                value={filters.department}
                onChange={e => setFilters({ ...filters, department: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={e => setFilters({ ...filters, date_from: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={e => setFilters({ ...filters, date_to: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Actions</Label>
              <Button onClick={fetchAnalytics} className="w-full" disabled={fetching}>
                {fetching ? "Loading..." : "Apply Filters"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {fetching ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !analytics ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📊</p>
          <p className="font-semibold text-gray-600">No analytics data available</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics.total_tasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{analytics.completed_tasks}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.completion_rate}% completion rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Blocked</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{analytics.blocked_tasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">{analytics.overdue_tasks}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.overdue_rate}% overdue rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {analytics.avg_completion_hours !== null ? `${analytics.avg_completion_hours}h` : "N/A"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Average actual hours per completed task</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Cycle Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {analytics.avg_cycle_time_hours !== null ? `${analytics.avg_cycle_time_hours}h` : "N/A"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Average time from creation to completion</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tasks by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                   {(Object.entries(analytics.tasks_by_priority) as [TaskPriority, number][]).map(([priority, count]) => (
                     <div key={priority} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Badge className={PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-700'}>
                           {priority}
                         </Badge>
                       </div>
                       <span className="font-medium">{count}</span>
                     </div>
                   ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.tasks_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge className={TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS] || 'bg-gray-100 text-gray-700'}>
                        {status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Employee Productivity</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.tasks_by_employee.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No employee data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Employee</th>
                        <th className="text-center py-2 px-2">Total</th>
                        <th className="text-center py-2 px-2">Completed</th>
                        <th className="text-center py-2 px-2">Blocked</th>
                        <th className="text-center py-2 px-2">Overdue</th>
                        <th className="text-center py-2 px-2">Avg Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.tasks_by_employee.map(emp => (
                        <tr key={emp.employee_id} className="border-b last:border-0">
                          <td className="py-2 px-2 font-medium">{emp.employee_name}</td>
                          <td className="text-center py-2 px-2">{emp.total}</td>
                          <td className="text-center py-2 px-2">
                            <span className="text-green-600 font-medium">{emp.completed}</span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="text-red-600 font-medium">{emp.blocked}</span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="text-orange-600 font-medium">{emp.overdue}</span>
                          </td>
                          <td className="text-center py-2 px-2">
                            {emp.avg_hours !== null ? emp.avg_hours : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
