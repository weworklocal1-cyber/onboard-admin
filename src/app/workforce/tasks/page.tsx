"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Task, TaskPriority, TaskStatus, Department, PRIORITY_COLORS, TASK_STATUS_COLORS, TaskComment, TaskWorkLog, TaskWatcher, TaskAssignee } from "@/types/workforce";
import { toast } from "sonner";

export default function TasksPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; full_name: string; department: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium" as TaskPriority,
    due_date: "",
    estimated_hours: "",
    department: (profile?.department as Department) || "operations",
    project_id: "",
    sprint_id: "",
    tags: [] as string[],
    tagsInput: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    due_date: "",
    assigned_to: "",
    status: "",
    blocker_reason: "",
    actual_hours: "",
    completion_notes: "",
    requires_approval: false,
    quality_flag: "",
    billable: false,
    billable_rate: "",
    project_id: "",
    sprint_id: "",
    tags: [] as string[],
    tagsInput: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    department: "",
    assigned_to: "",
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [sprints, setSprints] = useState<{ id: string; name: string; project_id: string }[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState({ action: "", value: "" });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const canManageAll = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;
  const ALL_DEPARTMENTS: Department[] = ['operations', 'marketing', 'engineering', 'sales', 'support', 'hr', 'finance'];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
              employee_id,
              employee:profiles!employee_id(id, full_name)
            )
          `)
          .order("created_at", { ascending: false });

        if (!canManageAll) {
          const { data: myAssignments, error: assigneeError } = await supabase
            .from("task_assignees")
            .select("task_id")
            .eq("employee_id", profile.id);

          if (assigneeError) console.error("Error fetching task_assignees:", assigneeError);

          const myTaskIds = myAssignments?.map(a => a.task_id) || [];
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
          toast.error(error.message || "Failed to load tasks");
          setTasks([]);
        } else {
          setTasks(data || []);
        }
      } catch (err) {
        console.error("fetchTasks error:", err);
      }
    };
    fetchTasks();
  }, [profile, filters, supabase, canManageAll]);

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

  useEffect(() => {
    let active = true;
    async function loadLookups() {
      const [projectsRes, sprintsRes] = await Promise.all([
        fetch("/api/workforce/projects"),
        fetch("/api/workforce/sprints"),
      ]);
      if (!active) return;
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
      if (sprintsRes.ok) {
        const data = await sprintsRes.json();
        setSprints(data.sprints || []);
      }
    }
    loadLookups();
    return () => { active = false; };
  }, []);

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
      const res = await fetch("/api/workforce/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...newTask,
          estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
          tags: newTask.tags,
        }),
      });
      if (res.ok) {
        toast.success("Task created");
        setShowAddModal(false);
        setNewTask({
          title: "",
          description: "",
          assigned_to: "",
          priority: "medium",
          due_date: "",
          estimated_hours: "",
          department: profile.department as Department || "operations",
          project_id: "",
          sprint_id: "",
          tags: [],
          tagsInput: "",
        });
        supabase.from("tasks")
          .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
          .order("created_at", { ascending: false })
          .then(({ data }) => setTasks(data || []));
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to create task");
      }
    } catch {
      toast.error("Failed to create task");
    }
    setSubmitting(false);
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
      actual_hours: task.actual_hours ? String(task.actual_hours) : "",
      completion_notes: task.completion_notes || "",
      requires_approval: task.requires_approval,
      quality_flag: task.quality_flag || "",
      billable: task.billable,
      billable_rate: task.billable_rate ? String(task.billable_rate) : "",
      project_id: task.project_id || "",
      sprint_id: task.sprint_id || "",
      tags: task.tags || [],
      tagsInput: "",
    });
    setShowEditModal(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
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
          ...editForm,
          actual_hours: editForm.actual_hours ? parseFloat(editForm.actual_hours) : null,
          billable_rate: editForm.billable_rate ? parseFloat(editForm.billable_rate) : null,
          tags: editForm.tags,
        }),
      });
      if (res.ok) {
        toast.success("Task updated");
        setShowEditModal(false);
        setEditingTask(null);
        supabase.from("tasks")
          .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
          .order("created_at", { ascending: false })
          .then(({ data }) => setTasks(data || []));
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to update task");
      }
    } catch {
      toast.error("Failed to update task");
    }
    setSubmitting(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        toast.success("Task deleted");
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete task");
      }
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const taskId = active.id as string;
    const statusToSet = over.id as TaskStatus;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: statusToSet }),
      });
      if (res.ok) {
        toast.success(`Task moved to ${statusToSet.replace(/_/g, " ")}`);
        supabase.from("tasks")
          .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
          .order("created_at", { ascending: false })
          .then(({ data }) => setTasks(data || []));
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to move task");
      }
    } catch {
      toast.error("Failed to move task");
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllTasks = () => {
    if (selectedTaskIds.size === tasks.length) setSelectedTaskIds(new Set());
    else setSelectedTaskIds(new Set(tasks.map(t => t.id)));
  };

  const handleBulkAction = async () => {
    if (!bulkAction.action || selectedTaskIds.size === 0) return;
    setBulkSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/tasks/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          task_ids: Array.from(selectedTaskIds),
          action: bulkAction.action,
          value: bulkAction.value || undefined,
        }),
      });
      if (res.ok) {
        toast.success(`Updated ${selectedTaskIds.size} tasks`);
        setSelectedTaskIds(new Set());
        setBulkAction({ action: "", value: "" });
        supabase.from("tasks")
          .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
          .order("created_at", { ascending: false })
          .then(({ data }) => setTasks(data || []));
      } else {
        const json = await res.json();
        toast.error(json.error || "Bulk action failed");
      }
    } catch {
      toast.error("Bulk action failed");
    }
    setBulkSubmitting(false);
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

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(t => t.due_date === todayStr && !["completed", "approved"].includes(t.status));
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < todayStr && !["completed", "approved", "rejected"].includes(t.status));
  const upcomingTasks = tasks.filter(t => t.due_date && t.due_date > todayStr && !["completed", "approved", "rejected"].includes(t.status));

  const getFilteredTasks = () => {
    let result = tasks;
    if (quickFilter === "today") result = todayTasks;
    else if (quickFilter === "overdue") result = overdueTasks;
    else if (quickFilter === "upcoming") result = upcomingTasks;
    else if (quickFilter === "completed") result = completedTasks;
    return result;
  };

  const displayedTasks = getFilteredTasks();
  const displayedTodo = displayedTasks.filter(t => t.status === "todo");
  const displayedInProgress = displayedTasks.filter(t => t.status === "in_progress");
  const displayedCompleted = displayedTasks.filter(t => t.status === "completed");
  const displayedBlocked = displayedTasks.filter(t => t.status === "blocked");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {canManageAll ? "Tasks" : "My Tasks"}
          </h1>
          <p className="text-sm text-gray-500">
            {canManageAll ? "Manage and track all tasks" : "View and manage your assigned tasks"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageAll && (
            <>
              <Link href="/workforce/team-tasks"><Button variant="outline">👥 Team Tasks</Button></Link>
              <Button
                variant={selectMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedTaskIds(new Set());
                }}
              >
                {selectMode ? "Cancel Selection" : "☑ Bulk Actions"}
              </Button>
              <Button onClick={() => setShowAddModal(true)}>➕ New Task</Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">{canManageAll ? "All Tasks" : "My Tasks"}</p>
            <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Today</p>
            <p className="text-2xl font-bold text-amber-600">{todayTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border overflow-hidden">
          {[
            { key: "all", label: "All" },
            { key: "today", label: "Today" },
            { key: "upcoming", label: "Upcoming" },
            { key: "overdue", label: "Overdue" },
            { key: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setQuickFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                quickFilter === tab.key
                  ? "bg-brand-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {tab.key === "all" && ` (${tasks.length})`}
              {tab.key === "today" && ` (${todayTasks.length})`}
              {tab.key === "upcoming" && ` (${upcomingTasks.length})`}
              {tab.key === "overdue" && ` (${overdueTasks.length})`}
              {tab.key === "completed" && ` (${completedTasks.length})`}
            </button>
          ))}
        </div>
      </div>

      {selectMode && canManageAll && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                  onCheckedChange={selectAllTasks}
                />
                <span className="text-sm font-medium">
                  {selectedTaskIds.size > 0 ? `${selectedTaskIds.size} selected` : "Select all"}
                </span>
              </div>

              <div className="h-6 w-px bg-gray-300 mx-2" />

              <Select
                value={bulkAction.action}
                onValueChange={(value) => setBulkAction({ ...bulkAction, action: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Change Status</SelectItem>
                  <SelectItem value="priority">Change Priority</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>

              {bulkAction.action === "status" && (
                <Select
                  value={bulkAction.value}
                  onValueChange={(value) => setBulkAction({ ...bulkAction, value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {bulkAction.action === "priority" && (
                <Select
                  value={bulkAction.value}
                  onValueChange={(value) => setBulkAction({ ...bulkAction, value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button
                size="sm"
                disabled={!bulkAction.action || selectedTaskIds.size === 0 || bulkSubmitting}
                onClick={handleBulkAction}
              >
                {bulkSubmitting ? "Applying..." : `Apply to ${selectedTaskIds.size}`}
              </Button>

              {selectedTaskIds.size > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTaskIds(new Set())}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                {ALL_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
                ))}
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
          {canManageAll && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (filters.status) params.set("status", filters.status);
                  if (filters.priority) params.set("priority", filters.priority);
                  if (filters.department) params.set("department", filters.department);
                  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
                  window.location.href = `/api/workforce/tasks/export?${params.toString()}`;
                }}
              >
                📊 Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const taskIds = tasks.map(t => t.id).join(",");
                  if (!taskIds) {
                    toast.error("No tasks to export");
                    return;
                  }
                  window.open(`/api/workforce/tasks/export-pdf?ids=${taskIds}`, "_blank");
                }}
              >
                📄 Export PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(canManageAll || tasks.length > 0) && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <TaskColumn
              title="To Do"
              tasks={displayedTodo}
              onEdit={openEditModal}
              onDelete={handleDeleteTask}
              onRefresh={() => {
                supabase.from("tasks")
                  .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
                  .order("created_at", { ascending: false })
                  .then(({ data }) => setTasks(data || []));
              }}
              selectMode={selectMode}
              selectedTaskIds={selectedTaskIds}
              onToggleTaskSelection={toggleTaskSelection}
            />
            <TaskColumn
              title="In Progress"
              tasks={displayedInProgress}
              onEdit={openEditModal}
              onDelete={handleDeleteTask}
              onRefresh={() => {
                supabase.from("tasks")
                  .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
                  .order("created_at", { ascending: false })
                  .then(({ data }) => setTasks(data || []));
              }}
              selectMode={selectMode}
              selectedTaskIds={selectedTaskIds}
              onToggleTaskSelection={toggleTaskSelection}
            />
            <TaskColumn
              title="Completed"
              tasks={displayedCompleted}
              onEdit={openEditModal}
              onDelete={handleDeleteTask}
              onRefresh={() => {
                supabase.from("tasks")
                  .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
                  .order("created_at", { ascending: false })
                  .then(({ data }) => setTasks(data || []));
              }}
              selectMode={selectMode}
              selectedTaskIds={selectedTaskIds}
              onToggleTaskSelection={toggleTaskSelection}
            />
            <TaskColumn
              title="Blocked"
              tasks={displayedBlocked}
              onEdit={openEditModal}
              onDelete={handleDeleteTask}
              onRefresh={() => {
                supabase.from("tasks")
                  .select(`*, creator:profiles!created_by(id, full_name), assignees:task_assignees(id, status, completed_at, employee:profiles!employee_id(id, full_name))`)
                  .order("created_at", { ascending: false })
                  .then(({ data }) => setTasks(data || []));
              }}
              selectMode={selectMode}
              selectedTaskIds={selectedTaskIds}
              onToggleTaskSelection={toggleTaskSelection}
            />
          </div>
        </DndContext>
      )}

      {displayedTasks.length === 0 && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg font-semibold text-gray-900 mb-1">No tasks found</p>
            <p className="text-sm text-gray-500 mb-4">
              {quickFilter !== "all"
                ? "Try adjusting your filters or check back later."
                : canManageAll
                ? "Create a new task to get started."
                : "You don't have any tasks assigned yet."}
            </p>
            {quickFilter !== "all" && (
              <Button variant="outline" onClick={() => setQuickFilter("all")}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <select
                      value={newTask.department}
                      onChange={e => setNewTask({ ...newTask, department: e.target.value as Department, assigned_to: "", project_id: "", sprint_id: "" })}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                      required
                    >
                      {ALL_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee *</Label>
                    <select
                      value={newTask.assigned_to}
                      onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select employee</option>
                      {allEmployees
                        .filter(emp => !newTask.department || emp.department === newTask.department)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Estimated Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={newTask.estimated_hours}
                      onChange={e => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                      placeholder="e.g. 4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <select
                      value={newTask.project_id}
                      onChange={e => setNewTask({ ...newTask, project_id: e.target.value })}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sprint</Label>
                  <select
                    value={newTask.sprint_id}
                    onChange={e => setNewTask({ ...newTask, sprint_id: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="">None</option>
                    {sprints
                      .filter(s => !newTask.project_id || s.project_id === newTask.project_id)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTask.tagsInput}
                      onChange={e => setNewTask({ ...newTask, tagsInput: e.target.value })}
                      placeholder="Add tag and press Enter"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = newTask.tagsInput.trim();
                          if (val && !newTask.tags.includes(val)) {
                            setNewTask({ ...newTask, tags: [...newTask.tags, val], tagsInput: "" });
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const val = newTask.tagsInput.trim();
                        if (val && !newTask.tags.includes(val)) {
                          setNewTask({ ...newTask, tags: [...newTask.tags, val], tagsInput: "" });
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {newTask.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {newTask.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200 flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setNewTask({ ...newTask, tags: newTask.tags.filter((_, i) => i !== idx) })}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editForm.due_date}
                      onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <select
                      value={editForm.assigned_to}
                      onChange={e => setEditForm({ ...editForm, assigned_to: e.target.value })}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select employee</option>
                      {allEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Blocker Reason</Label>
                  <Input
                    value={editForm.blocker_reason}
                    onChange={e => setEditForm({ ...editForm, blocker_reason: e.target.value })}
                    placeholder="Why is this task blocked?"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Actual Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={editForm.actual_hours}
                      onChange={e => setEditForm({ ...editForm, actual_hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Completion Notes</Label>
                    <Input
                      value={editForm.completion_notes}
                      onChange={e => setEditForm({ ...editForm, completion_notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="requires_approval"
                    checked={editForm.requires_approval}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, requires_approval: !!checked })}
                  />
                  <Label htmlFor="requires_approval">Requires Approval</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingTask(null); }}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TaskColumn({ title, tasks, onEdit, onDelete, onRefresh, selectMode, selectedTaskIds, onToggleTaskSelection }: {
  title: string;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onRefresh?: () => void;
  selectMode?: boolean;
  selectedTaskIds?: Set<string>;
  onToggleTaskSelection?: (taskId: string) => void;
}) {
  return (
    <Card data-column-title={title}>
      <CardHeader>
        <CardTitle className="text-base">{title} ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No tasks</p>
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefresh={onRefresh}
                selectMode={selectMode}
                isSelected={selectedTaskIds?.has(task.id) || false}
                onToggleTaskSelection={onToggleTaskSelection}
              />
            ))}
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, onEdit, onDelete, onRefresh, selectMode, isSelected, onToggleTaskSelection }: {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onRefresh?: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleTaskSelection?: (taskId: string) => void;
}) {
  const supabase = createClient();
  const { profile } = useAuth();
  const canManageAll = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;
  const [updating, setUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; url: string; file_name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: string; action: string; old_value: Record<string, unknown>; new_value: Record<string, unknown>; notes: string | null; created_at: string; actor: { full_name: string } }[]>([]);
  const [showWorkLog, setShowWorkLog] = useState(false);
  const [workLogs, setWorkLogs] = useState<TaskWorkLog[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [workLogForm, setWorkLogForm] = useState({ hours: "", description: "", is_billable: false });
  const [addingWorkLog, setAddingWorkLog] = useState(false);
  const [showWatchers, setShowWatchers] = useState(false);
  const [watchers, setWatchers] = useState<TaskWatcher[]>([]);
  const [watcherForm, setWatcherForm] = useState({ employee_id: "" });
  const [allWatchers, setAllWatchers] = useState<{ id: string; full_name: string }[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [employeeBlocker, setEmployeeBlocker] = useState("");
  const [showEmployeeActions, setShowEmployeeActions] = useState(false);

  const isMyTask = () => {
    if (!profile || !task.assignees) return false;
    return task.assignees.some(a => a.employee_id === profile.id);
  };

  const myAssignee = task.assignees?.find(a => a.employee_id === profile?.id);

  useEffect(() => {
    if (timerRunning) {
      const interval = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [timerRunning]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartTimer = () => {
    setTimerRunning(true);
  };

  const handleStopTimer = async () => {
    if (timerSeconds < 60) {
      toast.error("Timer must run for at least 1 minute");
      return;
    }
    const hours = timerSeconds / 3600;
    setTimerRunning(false);
    setTimerSeconds(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${task.id}/work-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          hours: hours.toFixed(2),
          description: "Timer log",
          is_billable: false,
        }),
      });
      if (res.ok) {
        toast.success(`Logged ${hours.toFixed(2)}h`);
        onRefresh?.();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to log time");
      }
    } catch {
      toast.error("Failed to log time");
    }
  };

  const handleEmployeeAction = async (action: "accept" | "complete" | "block" | "decline") => {
    if (!profile) return;
    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${task.id}/assignees/${profile.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action, blocker_reason: employeeBlocker || null }),
      });
      if (res.ok) {
        toast.success(`Task ${action}ed`);
        setEmployeeBlocker("");
        setShowEmployeeActions(false);
        onRefresh?.();
      } else {
        const json = await res.json();
        toast.error(json.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
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
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ content: comment.trim() }),
    });
    if (res.ok) {
      toast.success("Comment added");
      setComment("");
      setShowMentionSuggestions(false);
      onRefresh?.();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to add comment");
    }
    setAddingComment(false);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setComment(value);
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex >= 0) {
      const afterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(" ");
      if (spaceIndex < 0 || spaceIndex > 20) {
        setMentionQuery(afterAt);
        setMentionStartIndex(lastAtIndex);
        setShowMentionSuggestions(true);
        return;
      }
    }
    setShowMentionSuggestions(false);
  };

  const insertMention = (fullName: string) => {
    if (mentionStartIndex >= 0) {
      const beforeMention = comment.substring(0, mentionStartIndex);
      setComment(`${beforeMention}@${fullName} `);
    } else {
      setComment(`@${fullName} `);
    }
    setShowMentionSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  };

  const filteredMentions = allEmployees.filter(emp =>
    emp.full_name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    emp.full_name.split(" ").some(part => part.toLowerCase().startsWith(mentionQuery.toLowerCase()))
  ).slice(0, 5);

  const fetchComments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/comments`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setComments(json.comments || []);
    }
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
    if (!file || !profile) return;
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
      if (res.ok) {
        toast.success("File uploaded");
        fetchAttachments();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to upload file");
      }
    } catch {
      toast.error("Failed to upload file");
    }
    setUploading(false);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${task.id}/attachments`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ attachment_id: attachmentId }),
      });
      if (res.ok) {
        toast.success("Attachment removed");
        fetchAttachments();
      } else {
        toast.error("Failed to remove attachment");
      }
    } catch {
      toast.error("Failed to remove attachment");
    }
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
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const fetchWorkLogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/work-logs`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setWorkLogs(json.workLogs || []);
      setTotalHours(json.totalHours || 0);
    }
  };

  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workLogForm.hours || !profile) return;
    setAddingWorkLog(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/work-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        hours: parseFloat(workLogForm.hours),
        description: workLogForm.description || null,
        is_billable: workLogForm.is_billable,
      }),
    });
    if (res.ok) {
      toast.success("Work log added");
      setWorkLogForm({ hours: "", description: "", is_billable: false });
      fetchWorkLogs();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to add work log");
    }
    setAddingWorkLog(false);
  };

  const handleToggleWorkLog = () => {
    if (!showWorkLog) fetchWorkLogs();
    setShowWorkLog(!showWorkLog);
  };

  const fetchWatchers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/watchers`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setWatchers(json.watchers || []);
    }
  };

  const handleAddWatcher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watcherForm.employee_id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${task.id}/watchers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ employee_id: watcherForm.employee_id }),
      });
      if (res.ok) {
        toast.success("Watcher added");
        setWatcherForm({ employee_id: "" });
        fetchWatchers();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to add watcher");
      }
    } catch {
      toast.error("Failed to add watcher");
    }
  };

  const handleRemoveWatcher = async (employeeId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/workforce/tasks/${task.id}/watchers`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ employee_id: employeeId }),
    });
    if (res.ok) {
      toast.success("Watcher removed");
      fetchWatchers();
    } else {
      toast.error("Failed to remove watcher");
    }
  };

  const handleToggleWatchers = () => {
    if (!showWatchers) fetchWatchers();
    setShowWatchers(!showWatchers);
  };

  useEffect(() => {
    const fetchAllEmployees = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "active")
        .order("full_name");
      if (data) setAllWatchers(data);
    };
    fetchAllEmployees();
  }, [supabase]);

  const priorityColor = PRIORITY_COLORS[task.priority] || "bg-gray-100 text-gray-700";
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split("T")[0] && !["completed", "approved", "rejected"].includes(task.status);
  const isDueToday = task.due_date === new Date().toISOString().split("T")[0] && !["completed", "approved", "rejected"].includes(task.status);

  return (
    <div className="p-3 border rounded-lg bg-white shadow-sm">
      {selectMode && (
        <div className="flex items-center justify-end mb-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleTaskSelection?.(task.id)}
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 leading-tight">{task.title}</h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-gray-500">
            <span className={priorityColor}>{task.priority}</span>
            <span>•</span>
            <Badge className={`${TASK_STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700'} text-[10px] font-medium px-2 py-0.5`}>
              {task.status.replace(/_/g, ' ')}
            </Badge>
            {task.due_date && (
              <>
                <span>•</span>
                <span className={isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-amber-600 font-medium" : ""}>
                  📅 Due {task.due_date}
                </span>
              </>
            )}
            {task.estimated_hours && (
              <>
                <span>•</span>
                <span>Est {task.estimated_hours}h</span>
              </>
            )}
            {task.actual_hours && (
              <>
                <span>•</span>
                <span className={task.estimated_hours && task.actual_hours > task.estimated_hours ? "text-red-600 font-medium" : "text-green-600"}>
                  Actual {task.actual_hours}h
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{task.description}</p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-200">
              {tag}
            </span>
          ))}
        </div>
      )}

      {task.assignees && task.assignees.length > 0 && (
        <div className="mt-3 pt-2 border-t space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Assigned ({task.assignees.length})</p>
          {task.assignees.map((assignee) => {
            const isCurrentUser = profile?.id === assignee.employee_id;
            const canUpdateStatus = isCurrentUser || ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile?.role || '');

            return (
              <div key={assignee.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-[10px] shrink-0">
                    {assignee.employee?.full_name?.charAt(0) || "?"}
                  </div>
                  <span className="truncate font-medium text-gray-900">{assignee.employee?.full_name}</span>
                  {isCurrentUser && <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">You</span>}
                </div>
                <div className="shrink-0 ml-2">
                  {canUpdateStatus ? (
                    <select
                      value={assignee.status}
                      onChange={e => {
                        e.preventDefault();
                        updateAssigneeStatus(assignee.employee_id, e.target.value);
                      }}
                      className="text-[11px] border border-gray-200 rounded-md px-1.5 py-1 bg-white font-medium cursor-pointer"
                      disabled={updating}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  ) : (
                    <Badge
                      className={`text-[10px] font-medium px-2 py-0.5 ${
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
      )}

      {task.blocker_reason && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-700 font-medium">🚫 {task.blocker_reason}</p>
        </div>
      )}

      {task.quality_flag && (
        <div className="mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
            task.quality_flag === 'clean' ? 'bg-green-100 text-green-700' :
            task.quality_flag === 'needs_rework' ? 'bg-yellow-100 text-yellow-700' :
            task.quality_flag === 'blocked_quality' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            Quality: {task.quality_flag.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {task.completion_notes && (
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">Notes:</span> {task.completion_notes}
          </p>
        </div>
      )}

      {/* Employee Self-Service Actions */}
      {isMyTask() && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {task.status === "todo" && (
            <Button size="sm" className="w-full bg-brand-primary hover:bg-brand-primary/90 font-medium" onClick={() => handleEmployeeAction("accept")} disabled={updating}>
              ✅ Accept Task
            </Button>
          )}
          {task.status === "in_progress" && (
            <>
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 font-medium" onClick={() => handleEmployeeAction("complete")} disabled={updating}>
                ✔ Mark Complete
              </Button>
              <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 font-medium" onClick={() => setShowEmployeeActions(!showEmployeeActions)} disabled={updating}>
                🚫 Block / Decline
              </Button>
              {showEmployeeActions && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Reason (optional)"
                    value={employeeBlocker}
                    onChange={e => setEmployeeBlocker(e.target.value)}
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleEmployeeAction("block")} disabled={updating}>
                    Confirm Block
                  </Button>
                </div>
              )}
            </>
          )}
          {task.status === "blocked" && isMyTask() && (
            <Button size="sm" variant="outline" className="w-full text-amber-700 border-amber-200 hover:bg-amber-50 font-medium" onClick={() => handleEmployeeAction("accept")} disabled={updating}>
              🔄 Resume Task
            </Button>
          )}
        </div>
      )}

      {/* Expandable Advanced Sections */}
      <div className="mt-3 pt-3 border-t space-y-2">
        <button onClick={() => { if (!showComments) fetchComments(); setShowComments(!showComments); }} className="text-xs text-brand-primary hover:underline font-medium w-full text-left">
          💬 {showComments ? "Hide" : "Show"} Comments
        </button>
        {showComments && (
          <div className="space-y-2">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(comments && comments.length > 0) ? comments.map((c) => (
                <div key={c.id} className="text-xs p-2 bg-gray-50 rounded-md border border-gray-100">
                  <span className="font-medium text-gray-900">{c.author?.full_name || "User"}</span>
                  <span className="text-gray-500 ml-2">{new Date(c.created_at).toLocaleString()}</span>
                  <p className="mt-1 text-gray-700">{c.content}</p>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-2">No comments yet</p>
              )}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-1.5">
              <Input
                placeholder="Add a comment..."
                value={comment}
                onChange={handleCommentChange}
                className="text-xs"
                disabled={addingComment}
              />
              <Button size="sm" type="submit" disabled={addingComment || !comment.trim()} className="text-xs">
                Post
              </Button>
             </form>
           </div>
         )}
 
         <button onClick={() => { if (!showAttachments) fetchAttachments(); setShowAttachments(!showAttachments); }} className="text-xs text-brand-primary hover:underline font-medium w-full text-left">
           📎 {showAttachments ? "Hide" : "Show"} Attachments {attachments.length > 0 && `(${attachments.length})`}
         </button>
         {showAttachments && (
           <div className="space-y-2">
             <div className="flex flex-wrap gap-2">
               {attachments.length === 0 ? (
                 <p className="text-xs text-gray-400 text-center py-2 w-full">No attachments</p>
               ) : (
                 attachments.map((att) => {
                   const ext = att.file_name.split('.').pop()?.toLowerCase() || '';
                   const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
                   const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext);
                   const canDelete = canManageAll || isMyTask() || task.created_by === profile?.id;
                   
                   return (
                     <div key={att.id} className="relative group inline-block">
                       {isImage ? (
                         <a href={att.url} target="_blank" rel="noopener noreferrer">
                           <img src={att.url} alt={att.file_name} className="max-h-32 rounded border border-gray-200 object-cover" />
                         </a>
                       ) : isVideo ? (
                         <video src={att.url} className="max-h-32 rounded border border-gray-200" controls />
                       ) : (
                         <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100">
                           <span className="text-lg">📄</span>
                           <span className="text-xs text-gray-700 max-w-[150px] truncate">{att.file_name}</span>
                         </a>
                       )}
                       {canDelete && (
                         <button
                           onClick={() => handleDeleteAttachment(att.id)}
                           className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           ✕
                         </button>
                       )}
                     </div>
                   );
                 })
               )}
             </div>
             {(canManageAll || isMyTask() || task.created_by === profile?.id) && (
               <div className="flex items-center gap-2">
                 <input
                   type="file"
                   ref={fileInputRef}
                   onChange={handleFileUpload}
                   className="hidden"
                 />
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={() => fileInputRef.current?.click()}
                   disabled={uploading}
                   className="text-xs"
                 >
                   {uploading ? "Uploading..." : "📎 Upload File"}
                 </Button>
               </div>
             )}
           </div>
         )}
 
         <button onClick={handleToggleWorkLog} className="text-xs text-brand-primary hover:underline font-medium w-full text-left">
           ⏱️ {showWorkLog ? "Hide" : "Show"} Work Logs {totalHours > 0 && `(${totalHours.toFixed(2)}h)`}
         </button>
        {showWorkLog && (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {workLogs.map((log) => (
                <div key={log.id} className="text-xs p-2 bg-gray-50 rounded-md border border-gray-100 flex justify-between items-start">
                  <div>
                    <span className="font-medium text-gray-900">{log.hours}h</span>
                    {log.description && <span className="text-gray-600 ml-2">{log.description}</span>}
                    <p className="text-gray-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  {log.is_billable && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Billable</span>}
                </div>
              ))}
              {workLogs.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No work logs</p>
              )}
            </div>
            <form onSubmit={handleAddWorkLog} className="space-y-1.5">
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  step="0.25"
                  placeholder="Hours"
                  value={workLogForm.hours}
                  onChange={e => setWorkLogForm({ ...workLogForm, hours: e.target.value })}
                  className="text-xs flex-1"
                  disabled={addingWorkLog}
                />
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={workLogForm.is_billable}
                    onChange={e => setWorkLogForm({ ...workLogForm, is_billable: e.target.checked })}
                  />
                  Billable
                </label>
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Description (optional)"
                  value={workLogForm.description}
                  onChange={e => setWorkLogForm({ ...workLogForm, description: e.target.value })}
                  className="text-xs flex-1"
                  disabled={addingWorkLog}
                />
                <Button size="sm" type="submit" disabled={addingWorkLog || !workLogForm.hours} className="text-xs">
                  Add
                </Button>
              </div>
            </form>
          </div>
        )}

        <button onClick={handleToggleHistory} className="text-xs text-brand-primary hover:underline font-medium w-full text-left">
          📜 {showHistory ? "Hide" : "Show"} History
        </button>
        {showHistory && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="text-xs p-2 bg-gray-50 rounded-md border border-gray-100">
                <span className="font-medium text-gray-900">{h.actor?.full_name || "System"}</span>
                <span className="text-gray-500 ml-2">{new Date(h.created_at).toLocaleString()}</span>
                <p className="text-gray-700 mt-0.5">{h.action}</p>
                {h.notes && <p className="text-gray-500 mt-0.5 italic">{h.notes}</p>}
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">No history</p>
            )}
          </div>
        )}

        <button onClick={handleToggleWatchers} className="text-xs text-brand-primary hover:underline font-medium w-full text-left">
          👁️ {showWatchers ? "Hide" : "Show"} Watchers ({watchers.length})
        </button>
        {showWatchers && (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {watchers.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-md border border-gray-100">
                  <span className="font-medium text-gray-900">{w.employee?.full_name || "User"}</span>
                  {w.employee_id !== profile?.id && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => handleRemoveWatcher(w.employee_id)}>
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              {watchers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No watchers</p>
              )}
            </div>
            <form onSubmit={handleAddWatcher} className="flex gap-1.5">
              <select
                value={watcherForm.employee_id}
                onChange={e => setWatcherForm({ ...watcherForm, employee_id: e.target.value })}
                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 flex-1 bg-white"
                required
              >
                <option value="">Add watcher...</option>
                {allWatchers
                  .filter(w => w.id !== profile?.id && !watchers.some(watcher => watcher.employee_id === w.id))
                  .map(w => (
                    <option key={w.id} value={w.id}>{w.full_name}</option>
                  ))}
              </select>
              <Button size="sm" type="submit" disabled={!watcherForm.employee_id} className="text-xs">
                Add
              </Button>
            </form>
          </div>
        )}

        {canManageAll && (
          <button onClick={() => onEdit?.(task)} className="text-xs text-brand-primary hover:underline font-medium w-full text-left pt-1">
            ✏️ Edit Task
          </button>
        )}
      </div>
    </div>
  );
}

