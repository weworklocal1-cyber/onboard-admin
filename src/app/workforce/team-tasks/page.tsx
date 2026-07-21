"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmployeeTaskStatus {
  employee_id: string;
  employee_name: string;
  department: string;
  task_id: string;
  task_title: string;
  task_priority: string;
  task_due_date: string | null;
  assignee_status: string;
  completed_at: string | null;
}

export default function TeamTasksPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTaskStatus[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filters, setFilters] = useState({
    department: "",
    status: "",
    employee: "",
    search: "",
  });
  const [allEmployees, setAllEmployees] = useState<{ id: string; full_name: string; department: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    fetchDepartments();
    fetchAllEmployees();
    fetchTeamTasks();
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

  const fetchAllEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, department")
      .eq("status", "active")
      .order("full_name");
    if (data) {
      setAllEmployees(data);
    }
  };

  const fetchTeamTasks = async () => {
    setFetching(true);
    try {
      let query = supabase
        .from("task_assignees")
        .select(`
          employee_id,
          status,
          completed_at,
          task:task_id(
            id,
            title,
            priority,
            due_date,
            department,
            created_by
          ),
          employee:employee_id(
            id,
            full_name,
            department
          )
        `)
        .order("created_at", { ascending: false });

      const { data: assignments, error } = await query;

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        setEmployeeTasks([]);
        setFetching(false);
        return;
      }

      // Transform the data
      const transformed: EmployeeTaskStatus[] = assignments
        .filter((a: any) => a.task && a.employee)
        .map((a: any) => ({
          employee_id: a.employee_id,
          employee_name: a.employee.full_name,
          department: a.employee.department,
          task_id: a.task.id,
          task_title: a.task.title,
          task_priority: a.task.priority,
          task_due_date: a.task.due_date,
          assignee_status: a.status,
          completed_at: a.completed_at,
        }));

      // Apply filters
      let filtered = transformed;
      if (filters.department) {
        filtered = filtered.filter(t => t.department === filters.department);
      }
      if (filters.status) {
        filtered = filtered.filter(t => t.assignee_status === filters.status);
      }
      if (filters.employee) {
        filtered = filtered.filter(t => t.employee_id === filters.employee);
      }
      if (filters.search) {
        filtered = filtered.filter(t => 
          t.task_title.toLowerCase().includes(filters.search.toLowerCase()) ||
          t.employee_name.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setEmployeeTasks(filtered);
    } catch (err: any) {
      console.error("Error fetching team tasks:", err);
      toast.error("Failed to load team tasks");
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

  const isLeadOrAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);

  if (!isLeadOrAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Group by employee
  const groupedByEmployee = employeeTasks.reduce((acc, task) => {
    if (!acc[task.employee_id]) {
      acc[task.employee_id] = {
        employee_name: task.employee_name,
        department: task.department,
        tasks: [],
      };
    }
    acc[task.employee_id].tasks.push(task);
    return acc;
  }, {} as Record<string, { employee_name: string; department: string; tasks: EmployeeTaskStatus[] }>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Tasks Dashboard</h1>
        <p className="text-gray-500">View all employees and their task statuses</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Search tasks or employees..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="text-sm"
              />
            </div>
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
              <Label className="text-xs">Status</Label>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <select
                value={filters.employee}
                onChange={e => setFilters({ ...filters, employee: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Employees</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          {(filters.search || filters.department || filters.status || filters.employee) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => setFilters({ department: "", status: "", employee: "", search: "" })}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {fetching ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : employeeTasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-semibold text-gray-600">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByEmployee).map(([employeeId, data]) => (
            <Card key={employeeId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                      {data.employee_name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{data.employee_name}</CardTitle>
                      <p className="text-xs text-gray-500">{data.department}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-700">
                      {data.tasks.filter(t => t.assignee_status === 'completed').length} Done
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700">
                      {data.tasks.filter(t => t.assignee_status === 'in_progress').length} Active
                    </Badge>
                    <Badge className="bg-red-100 text-red-700">
                      {data.tasks.filter(t => t.assignee_status === 'blocked').length} Blocked
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.tasks.map(task => (
                  <div key={task.task_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.task_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${getPriorityColor(task.task_priority)}`}>
                          {task.task_priority}
                        </Badge>
                        {task.task_due_date && (
                          <span className="text-xs text-gray-500">
                            📅 Due {format(new Date(task.task_due_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Badge className={`text-xs ${getStatusColor(task.assignee_status)}`}>
                        {task.assignee_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
