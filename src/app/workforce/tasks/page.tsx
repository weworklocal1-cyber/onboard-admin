"use client";

import { useEffect, useState } from "react";
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

export default function TasksPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium" as TaskPriority,
    due_date: "",
    estimated_hours: "",
    department: "operations" as Department,
  });

  useEffect(() => {
    if (!profile) return;

    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select(`*, 
          assignee:profiles!assigned_to(id, full_name), 
          creator:profiles!created_by(id, full_name),
          comments:task_comments(
            id, content, created_at,
            author:profiles!author_id(id, full_name)
          )
        `)
        .order("created_at", { ascending: false });

      setTasks(data || []);
    };

    fetchTasks();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newTask.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("tasks").insert({
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      assigned_to: newTask.assigned_to || profile.id,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      estimated_hours: parseInt(newTask.estimated_hours) || null,
      department: newTask.department,
      created_by: profile.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Task created!");
      setShowAddModal(false);
      setNewTask({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "", estimated_hours: "", department: "operations" });
      supabase.from("tasks")
        .select(`*, assignee:profiles!assigned_to(id, full_name), creator:profiles!created_by(id, full_name)`)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTasks(data || []));
    }
    setSubmitting(false);
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <TaskColumn title="To Do" tasks={todoTasks} />
        <TaskColumn title="In Progress" tasks={inProgressTasks} />
        <TaskColumn title="Completed" tasks={completedTasks} />
        <TaskColumn title="Blocked" tasks={blockedTasks} />
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
                <Label>Department</Label>
                <select
                  value={newTask.department}
                  onChange={e => setNewTask({ ...newTask, department: e.target.value as Department })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="operations">Operations</option>
                  <option value="marketing">Marketing</option>
                  <option value="engineering">Engineering</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                </select>
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
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
}: {
  title: string;
  tasks: Task[];
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
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TaskCard({ task }: { task: Task }) {
  const supabase = createClient();
  const { profile } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const update: { status: string; completed_at?: string } = { status: newStatus };
    if (newStatus === "completed") update.completed_at = new Date().toISOString();
    const { error } = await supabase.from("tasks").update(update).eq("id", task.id);
    if (!error) {
      toast.success(`Task ${newStatus}`);
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

  return (
    <div className="p-3 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
      )}
      {task.due_date && (
        <p className="text-xs text-gray-500 mt-1">📅 Due {task.due_date}</p>
      )}
      <Badge className={`mt-2 ${PRIORITY_COLORS[task.priority]}`}>
        {task.priority}
      </Badge>

      {task.blocker_reason && (
        <p className="text-xs text-red-600 mt-1">🚫 {task.blocker_reason}</p>
      )}

      {task.status === "todo" && (
        <Button size="sm" className="mt-2 w-full" onClick={() => updateStatus("in_progress")} disabled={updating}>
          Start
        </Button>
      )}
      {task.status === "in_progress" && (
        <Button size="sm" className="mt-2 w-full" onClick={() => updateStatus("completed")} disabled={updating}>
          Complete
        </Button>
      )}
      {task.status !== "completed" && task.status !== "blocked" && (
        <Button size="sm" variant="outline" className="mt-1 w-full" onClick={() => updateStatus("blocked")} disabled={updating}>
          Block
        </Button>
      )}

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
    </div>
  );
}