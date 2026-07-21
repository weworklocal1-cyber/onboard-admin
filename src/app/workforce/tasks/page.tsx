"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Task, TaskPriority, Department, PRIORITY_COLORS, TaskComment } from "@/types/workforce";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function TasksPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; full_name: string; department: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium" as TaskPriority,
    due_date: "",
    estimated_hours: "",
    department: profile?.department || "operations" as Department,
  });
  const [employeeFilterDept, setEmployeeFilterDept] = useState<string>("all");
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    due_date: "",
    assigned_to: "",
    status: "",
    blocker_reason: "",
    actual_hours: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    department: "",
    assigned_to: "",
  });

  const canManageAll = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;
  const ALL_DEPARTMENTS: Department[] = ['operations', 'marketing', 'engineering', 'sales', 'support', 'hr', 'finance'];

  useEffect(() => {
    if (!profile) return;

    const fetchTasks = async () => {
      try {
        let query = supabase
          .from("tasks")
          .select(`*, 
            creator:profiles!created_by(id, full_name),
            assignees:task_assignees(
              id,
              status,
              completed_at,
              employee:profiles!employee_id(id, full_name)
            )
          `)
          .order("created_at", { ascending: false });

        // For non-admin users, only show tasks where they are an assignee
        if (!canManageAll) {
          // Get task IDs where user is an assignee
          const { data: myAssignments, error: assigneeError } = await supabase
            .from("task_assignees")
            .select("task_id")
            .eq("employee_id", profile.id);

          if (assigneeError) {
            console.error("Error fetching task_assignees:", assigneeError);
          }

          const myTaskIds = myAssignments?.map(a => a.task_id) || [];
          console.log("My task IDs:", myTaskIds, "for user:", profile.id, "role:", profile.role);
          
          if (myTaskIds.length === 0) {
            setTasks([]);
            return;
          }

          query = query.in("id", myTaskIds);
        }

        if (filters.status) query = query.eq("status", filters.status);
        if (filters.priority) query = query.eq("priority", filters.priority);
        if (filters.department) query = query.eq("department", filters.department);
        if (filters.search) query = query.ilike("title", `%${filters.search}%`);

        const { data, error } = await query;
        if (error) {
          console.error("Error fetching tasks:", error);
        }
        console.log("Fetched tasks:", data?.length || 0);
        setTasks(data || []);
      } catch (err) {
        console.error("fetchTasks error:", err);
      }
    };

    fetchTasks();
  }, [profile, filters, supabase, canManageAll]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, department")
        .eq("status", "active")
        .order("full_name");
      setAllEmployees(data || []);
    };
    fetchEmployees();
  }, [supabase]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newTask.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!newTask.department) {
      toast.error("Please select a department");
      return;
    }
    if (!newTask.assigned_to) {
      toast.error("Please select an employee");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Build assignees array
      let assignees: string[];
      if (newTask.assigned_to === "__all__") {
        const { data: deptEmployees } = await supabase
          .from("profiles")
          .select("id")
          .eq("department", newTask.department)
          .eq("status", "active");
        assignees = deptEmployees?.map(e => e.id) || [];
      } else {
        assignees = [newTask.assigned_to];
      }

      const res = await fetch("/api/workforce/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          assignees,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
          department: newTask.department,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create task");
      toast.success(assignees.length > 1 ? `Task created for ${assignees.length} employees!` : "Task created!");
      setShowAddModal(false);
      setNewTask({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "", estimated_hours: "", department: profile?.department || "operations" });
      setEmployeeFilterDept("all");
      // Refresh tasks
      supabase.from("tasks")
        .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTasks(data || []));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        toast.success("Task deleted");
        supabase.from("tasks")
          .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
          .order("created_at", { ascending: false })
          .then(({ data }) => setTasks(data || []));
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          priority: editForm.priority,
          due_date: editForm.due_date || null,
          assigned_to: editForm.assigned_to || null,
          status: editForm.status,
          blocker_reason: editForm.blocker_reason || null,
          actual_hours: editForm.actual_hours || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update task");
      toast.success("Task updated!");
      setShowEditModal(false);
      setEditingTask(null);
      // Refresh tasks
      supabase.from("tasks")
        .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTasks(data || []));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      due_date: task.due_date || "",
      assigned_to: task.assigned_to,
      status: task.status,
      blocker_reason: task.blocker_reason || "",
      actual_hours: task.actual_hours?.toString() || "",
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const blockedTasks = tasks.filter(t => t.status === "blocked");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setShowAddModal(true)}>➕ New Task</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Search tasks..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <select
                value={filters.priority}
                onChange={e => setFilters({ ...filters, priority: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <select
                value={filters.department}
                onChange={e => setFilters({ ...filters, department: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Departments</option>
                <option value="operations">Operations</option>
                <option value="marketing">Marketing</option>
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assignee</Label>
              <select
                value={filters.assigned_to}
                onChange={e => setFilters({ ...filters, assigned_to: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">All Assignees</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          {(filters.search || filters.status || filters.priority || filters.department || filters.assigned_to) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => setFilters({ search: "", status: "", priority: "", department: "", assigned_to: "" })}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <TaskColumn title="To Do" tasks={todoTasks} onEdit={openEditModal} onDelete={handleDeleteTask} onRefresh={() => {
          supabase.from("tasks")
            .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
            .order("created_at", { ascending: false })
            .then(({ data }) => setTasks(data || []));
        }} />
        <TaskColumn title="In Progress" tasks={inProgressTasks} onEdit={openEditModal} onDelete={handleDeleteTask} onRefresh={() => {
          supabase.from("tasks")
            .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
            .order("created_at", { ascending: false })
            .then(({ data }) => setTasks(data || []));
        }} />
        <TaskColumn title="Completed" tasks={completedTasks} onEdit={openEditModal} onDelete={handleDeleteTask} onRefresh={() => {
          supabase.from("tasks")
            .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
            .order("created_at", { ascending: false })
            .then(({ data }) => setTasks(data || []));
        }} />
        <TaskColumn title="Blocked" tasks={blockedTasks} onEdit={openEditModal} onDelete={handleDeleteTask} onRefresh={() => {
          supabase.from("tasks")
            .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
            .order("created_at", { ascending: false })
            .then(({ data }) => setTasks(data || []));
        }} />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Create New Task</h2>
            </div>
            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <select
                  value={newTask.department}
                  onChange={e => {
                    const selectedDept = e.target.value as Department;
                    setNewTask({ ...newTask, department: selectedDept, assigned_to: "" });
                    setEmployeeFilterDept(selectedDept);
                  }}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select department...</option>
                  {ALL_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign To *</Label>
                <select
                  value={newTask.assigned_to}
                  onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  required
                  disabled={!newTask.department}
                >
                  <option value="">Select employee...</option>
                  {newTask.department && (
                    <>
                      <option value="__all__">All employees in {newTask.department}</option>
                      {allEmployees
                        .filter(emp => emp.department === newTask.department)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                    </>
                  )}
                </select>
                {!newTask.department && (
                  <p className="text-xs text-gray-500">Select a department first</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Edit Task</h2>
            </div>
            <form onSubmit={handleEditTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  placeholder="Task title"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Description"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={editForm.due_date}
                  onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 4.5"
                  value={editForm.actual_hours}
                  onChange={e => setEditForm({ ...editForm, actual_hours: e.target.value })}
                />
                {editingTask?.estimated_hours && (
                  <p className="text-xs text-gray-500">
                    Estimated: {editingTask.estimated_hours}h
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <select
                  value={editForm.assigned_to}
                  onChange={e => setEditForm({ ...editForm, assigned_to: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              {editForm.status === "blocked" && (
                <div className="space-y-1.5">
                  <Label>Blocker Reason</Label>
                  <Textarea
                    placeholder="Why is this task blocked?"
                    value={editForm.blocker_reason}
                    onChange={e => setEditForm({ ...editForm, blocker_reason: e.target.value })}
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingTask(null); }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  onEdit,
  onDelete,
  onRefresh,
}: {
  title: string;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onRefresh?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title} ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No tasks</p>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onRefresh={onRefresh} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, onEdit, onDelete, onRefresh }: { task: Task; onEdit?: (task: Task) => void; onDelete?: (taskId: string) => void; onRefresh?: () => void }) {
  const supabase = createClient();
  const { profile } = useAuth();
  const canManageAll = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;
  const [updating, setUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; url: string; file_name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: string; action: string; old_value: Record<string, unknown>; new_value: Record<string, unknown>; notes: string | null; created_at: string; actor: { full_name: string } }[]>([]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const oldStatus = task.status;
    const update: { status: string; completed_at?: string } = { status: newStatus };
    if (newStatus === "completed") update.completed_at = new Date().toISOString();
    const { error } = await supabase.from("tasks").update(update).eq("id", task.id);
    if (!error) {
      toast.success(`Task ${newStatus}`);

      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/workforce/tasks/${task.id}/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: "status_changed",
          old_value: { status: oldStatus },
          new_value: { status: newStatus },
        }),
      }).catch(err => console.error("Failed to log task history:", err));

      if (newStatus === "blocked") {
        await supabase.from("notifications").insert({
          recipient_id: task.created_by,
          sender_id: profile?.id,
          type: "blocker_flagged",
          title: "Task Blocked",
          message: `Task "${task.title}" has been marked as blocked.`,
          data: { task_id: task.id, priority: task.priority },
          read: false,
        });
      }
      if (newStatus === "completed") {
        await supabase.from("notifications").insert({
          recipient_id: task.created_by,
          sender_id: profile?.id,
          type: "task_updated",
          title: "Task Completed",
          message: `Task "${task.title}" has been marked as completed.`,
          data: { task_id: task.id },
          read: false,
        });
      }
    }
    setUpdating(false);
  };

  const updateAssigneeStatus = async (assigneeId: string, newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("task_assignees")
      .update({ 
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("task_id", task.id)
      .eq("employee_id", assigneeId);

    if (!error) {
      toast.success(`Status updated to ${newStatus}`);
      onRefresh?.();
    } else {
      toast.error("Failed to update status");
    }
    setUpdating(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !profile) return;

    setAddingComment(true);
    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      author_id: profile.id,
      content: comment.trim(),
    });

    if (!error) {
      toast.success("Comment added");
      setComment("");
    } else {
      toast.error(error.message);
    }
    setAddingComment(false);
  };

  const fetchAttachments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/attachments`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setAttachments(json.attachments || []);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/workforce/tasks/${task.id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to upload");
      toast.success("Attachment uploaded!");
      fetchAttachments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, _url: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${task.id}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.ok) {
        toast.success("Attachment removed");
        setAttachments(attachments.filter(a => a.id !== attachmentId));
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleToggleAttachments = () => {
    if (!showAttachments) {
      fetchAttachments();
    }
    setShowAttachments(!showAttachments);
  };

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/history`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setHistory(json.history || []);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="p-3 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
      )}
      {task.due_date && (
        <p className="text-xs text-gray-500 mt-1">📅 Due {task.due_date}</p>
      )}
      {task.actual_hours && (
        <p className="text-xs text-gray-500 mt-1">
          ⏱️ Actual: {task.actual_hours}h
          {task.estimated_hours && (
            <span className={`ml-2 ${task.actual_hours > task.estimated_hours ? "text-red-600" : "text-green-600"}`}>
              (Est: {task.estimated_hours}h)
            </span>
          )}
        </p>
      )}
      <Badge className={`mt-2 ${PRIORITY_COLORS[task.priority]}`}>
        {task.priority}
      </Badge>

      {task.blocker_reason && (
        <p className="text-xs text-red-600 mt-1">🚫 {task.blocker_reason}</p>
      )}

      {/* Multiple Assignees Section */}
      {task.assignees && task.assignees.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <p className="text-xs font-medium text-gray-700 mb-2">
            👥 Assigned to {task.assignees.length} employee(s)
          </p>
          <div className="space-y-1.5">
            {task.assignees.map((assignee: any) => {
              const isCurrentUser = profile?.id === assignee.employee_id;
              const canUpdateStatus = isCurrentUser || ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile?.role || '');
              
              return (
                <div key={assignee.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                      {assignee.employee?.full_name?.charAt(0) || "?"}
                    </div>
                    <span className="truncate font-medium">{assignee.employee?.full_name}</span>
                    {isCurrentUser && <span className="text-[10px] text-blue-600">(You)</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canUpdateStatus ? (
                      <select
                        value={assignee.status}
                        onChange={e => {
                          e.preventDefault();
                          updateAssigneeStatus(assignee.employee_id, e.target.value);
                        }}
                        className="text-xs border rounded px-1 py-0.5"
                        disabled={updating}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    ) : (
                      <Badge 
                        className={`text-[10px] ${
                          assignee.status === 'completed' ? 'bg-green-100 text-green-700' :
                          assignee.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          assignee.status === 'blocked' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {assignee.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Only show main status buttons for admins/creators */}
      {canManageAll && task.status === "todo" && (
        <Button size="sm" className="mt-2 w-full" onClick={() => updateStatus("in_progress")} disabled={updating}>
          Start
        </Button>
      )}
      {canManageAll && task.status === "in_progress" && (
        <Button size="sm" className="mt-2 w-full" onClick={() => updateStatus("completed")} disabled={updating}>
          Complete
        </Button>
      )}
      {canManageAll && task.status !== "completed" && task.status !== "blocked" && (
        <Button size="sm" variant="outline" className="mt-1 w-full" onClick={() => updateStatus("blocked")} disabled={updating}>
          Block
        </Button>
      )}
      <Button size="sm" variant="ghost" className="mt-1 w-full text-xs" onClick={() => onEdit?.(task)}>
        ✏️ Edit
      </Button>
      <Button size="sm" variant="ghost" className="mt-1 w-full text-xs text-red-600 hover:text-red-700" onClick={() => onDelete?.(task.id)}>
        🗑️ Delete
      </Button>

      <div className="mt-2 pt-2 border-t">
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-xs text-brand-primary hover:underline"
        >
          💬 {task.comments?.length || 0} comments
        </button>

        {showComments && (
          <div className="mt-2 space-y-2">
            {task.comments && task.comments.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {task.comments.map((c: TaskComment) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-medium">{c.author?.full_name || "User"}:</span> {c.content}
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddComment} className="flex gap-1">
              <Input
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add comment..."
                className="text-xs h-7"
              />
              <Button size="sm" type="submit" disabled={addingComment || !comment.trim()}>
                Send
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t">
        <button
          onClick={handleToggleAttachments}
          className="text-xs text-brand-primary hover:underline"
        >
          📎 {attachments.length > 0 ? `${attachments.length} attachment(s)` : "Attachments"}
        </button>

        {showAttachments && (
          <div className="mt-2 space-y-2">
            {attachments.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-xs p-1.5 bg-white rounded border">
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline truncate max-w-[150px]">
                      📄 {att.file_name}
                    </a>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteAttachment(att.id, att.url)}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="text-xs"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm"
                style={{ display: 'none' }}
              />
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "+ Add File"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t">
        <button
          onClick={handleToggleHistory}
          className="text-xs text-brand-primary hover:underline"
        >
          📜 {history.length > 0 ? `${history.length} change(s)` : "History"}
        </button>

        {showHistory && (
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {history.length > 0 ? (
              history.map((entry) => (
                <div key={entry.id} className="text-xs p-1.5 bg-white rounded border">
                  <span className="font-medium">{entry.actor?.full_name || "System"}</span>
                  {" "}{entry.action.replace(/_/g, " ")}
                  {(entry.new_value as { status?: string })?.status && (
                    <span> → <strong>{String((entry.new_value as { status?: string }).status).replace(/_/g, " ")}</strong></span>
                  )}
                  <span className="text-gray-400 ml-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No history yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}