"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ClipboardList,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TeamsDashboardPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [attendance, setAttendance] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyUpdate, setDailyUpdate] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.id) return;
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const [{ data: attData }, { data: updateData }] = await Promise.all([
        supabase.from("attendance").select("*").eq("employee_id", profile.id).eq("date", todayStr).maybeSingle(),
        supabase.from("daily_updates").select("*").eq("employee_id", profile.id).eq("date", todayStr).maybeSingle(),
      ]);

      setAttendance(attData);
      setDailyUpdate(updateData);
      await fetchMyTasks();
    } catch (err: any) {
      console.error("Teams dashboard error:", err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMyTasks = async () => {
    if (!profile?.id) return;
    try {
      const { data: assignments, error: assigneeError } = await supabase
        .from("task_assignees")
        .select("task_id, status, completed_at")
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false });

      if (assigneeError) throw assigneeError;

      const myTaskIds = (assignments || []).map((a) => a.task_id);
      const statusByTaskId = new Map((assignments || []).map((a) => [a.task_id, a]));
      
      console.log('[TeamsDashboard] task_assignees result:', { assignments, myTaskIds });

      let taskRows: any[] = [];
      if (myTaskIds.length > 0) {
        const { data: rows, error: taskError } = await supabase
          .from("tasks")
          .select(`id, title, description, priority, due_date, status, department, created_at, created_by`)
          .in("id", myTaskIds)
          .order("created_at", { ascending: false });

        if (taskError) throw taskError;
        taskRows = rows || [];
        console.log('[TeamsDashboard] tasks via task_assignees rows:', taskRows.length);
      } else {
        console.log('[TeamsDashboard] no task_assignee rows, falling back to tasks.assigned_to');
      }

      const { data: assignedDirectly } = await supabase
        .from("tasks")
        .select(`id, title, description, priority, due_date, status, department, created_at, created_by`)
        .eq("assigned_to", profile.id)
        .order("created_at", { ascending: false });

      const directRows = assignedDirectly || [];
      console.log('[TeamsDashboard] tasks via assigned_to fallback rows:', directRows.length);

      const mergedMap = new Map<string, any>();
      for (const t of taskRows) mergedMap.set(t.id, t);
      for (const t of directRows) {
        if (!mergedMap.has(t.id)) {
          mergedMap.set(t.id, { ...t, _assignee_status: "todo" });
        }
      }

      const combinedTaskRows = Array.from(mergedMap.values());
      if (combinedTaskRows.length === 0) {
        setTasks([]);
        return;
      }

      const { data: creators } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", combinedTaskRows.map((t: any) => t.created_by).filter(Boolean));

      const creatorById = new Map((creators || []).map((c: any) => [c.id, c]));

      const mapped = combinedTaskRows
        .map((t: any) => {
          const assigneeRecord = statusByTaskId.get(t.id);
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            due_date: t.due_date,
            status: t.status,
            department: t.department,
            created_at: t.created_at,
            creator: t.created_by ? creatorById.get(t.created_by) || null : null,
            assignee_status: assigneeRecord?.status || t._assignee_status || "pending",
            completed_at: assigneeRecord?.completed_at || null,
          };
        });

      console.log('[TeamsDashboard] final mapped tasks:', mapped);
      setTasks(mapped);
    } catch (err: any) {
      console.error("Error fetching my tasks:", err.message);
    }
  };

  const handleTaskAction = async (taskId: string, action: "accept" | "complete" | "block") => {
    if (!profile) return;
    setUpdatingTaskId(taskId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/${taskId}/assignees/${profile.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast.success(action === "accept" ? "Task accepted" : action === "complete" ? "Task marked complete" : "Task blocked");
        await fetchMyTasks();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to update task");
      }
    } catch {
      toast.error("Failed to update task");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Please log in to view your dashboard</p>
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const activeTasks = tasks.filter(t => t.status !== "completed");
  const urgentTasks = activeTasks.filter(t => t.priority === "urgent");
  const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < todayStr);
  const todoTasks = activeTasks.filter(t => t.status === "todo");
  const inProgressTasks = activeTasks.filter(t => t.status === "in_progress");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "blocked": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Hello, {profile.full_name}</h1>
        <p className="text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={attendance ? (attendance.status === "present" ? "success" : "warning") : "secondary"}>
              {attendance ? attendance.status.replace(/_/g, " ") : "Not Checked In"}
            </Badge>
            {attendance?.check_in_time && (
              <p className="text-xs text-gray-500 mt-1">
                In: {format(new Date(attendance.check_in_time), "hh:mm a")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
            <p className="text-xs text-gray-500">Tasks in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            <p className="text-xs text-gray-500">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              EOD Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={dailyUpdate ? "success" : "warning"}>
              {dailyUpdate ? "Submitted" : "Pending"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Tasks</CardTitle>
            <Link href="/workforce/tasks">
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {activeTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-medium text-gray-600">No active tasks</p>
              <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
              <p className="text-[10px] text-gray-300 mt-2">Debug: profile={profile?.id}</p>
            </div>
          ) : (
            <div className="space-y-3">
               {activeTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                  className={`p-4 rounded-lg border cursor-pointer transition hover:shadow-md ${
                    task.priority === "urgent"
                      ? "bg-red-50 border-red-200 hover:border-red-300"
                      : task.priority === "high"
                      ? "bg-orange-50 border-orange-200 hover:border-orange-300"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">{task.title}</h4>
                        <Badge className={`${getPriorityColor(task.priority)} text-[10px] font-medium`}>
                          {task.priority}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
                        <Badge className={`${getStatusColor(task.assignee_status || task.status)} text-[10px] font-medium px-2 py-0.5`}>
                          {(task.assignee_status || task.status).replace(/_/g, " ")}
                        </Badge>

                        {task.due_date && (
                          <span className={overdueTasks.some((t) => t.id === task.id) ? "text-red-600 font-medium" : ""}>
                            📅 Due {format(new Date(task.due_date), "MMM d, yyyy")}
                          </span>
                        )}

                        {task.department && (
                          <span className="text-gray-400">• {task.department}</span>
                        )}

                        {task.creator?.full_name && (
                          <span className="text-gray-400">• By {task.creator.full_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {task.assignee_status === "todo" && (
                        <Button
                          size="sm"
                          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-xs"
                          onClick={() => handleTaskAction(task.id, "accept")}
                          disabled={updatingTaskId === task.id}
                        >
                          {updatingTaskId === task.id ? "..." : "Accept"}
                        </Button>
                      )}
                      {task.assignee_status === "in_progress" && (
                        <>
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-xs"
                            onClick={() => handleTaskAction(task.id, "complete")}
                            disabled={updatingTaskId === task.id}
                          >
                            {updatingTaskId === task.id ? "..." : "Complete"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleTaskAction(task.id, "block")}
                            disabled={updatingTaskId === task.id}
                          >
                            Block
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {urgentTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              Urgent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentTasks.map(task => (
              <div
                key={task.id}
                onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                className="text-sm p-3 bg-white rounded-lg border border-red-100 cursor-pointer hover:border-red-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      {task.due_date && <span>📅 Due {format(new Date(task.due_date), "MMM d, yyyy")}</span>}
                      {task.department && <span>• {task.department}</span>}
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-gray-400 shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg leading-tight">{selectedTask.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowTaskModal(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${getPriorityColor(selectedTask.priority)} font-medium`}>
                  {selectedTask.priority}
                </Badge>
                <Badge className={`${getStatusColor(selectedTask.assignee_status || selectedTask.status)} font-medium`}>
                  {(selectedTask.assignee_status || selectedTask.status).replace(/_/g, " ")}
                </Badge>
                {selectedTask.department && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {selectedTask.department}
                  </span>
                )}
              </div>

              {selectedTask.description && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Description</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedTask.due_date && (
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">{format(new Date(selectedTask.due_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {selectedTask.creator?.full_name && (
                  <div>
                    <p className="text-xs text-gray-500">Assigned By</p>
                    <p className="font-medium text-gray-900">{selectedTask.creator.full_name}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {selectedTask.assignee_status === "todo" && (
                  <Button
                    className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
                    onClick={() => { handleTaskAction(selectedTask.id, "accept"); setShowTaskModal(false); }}
                    disabled={updatingTaskId === selectedTask.id}
                  >
                    {updatingTaskId === selectedTask.id ? "Updating..." : "✅ Accept Task"}
                  </Button>
                )}
                {selectedTask.assignee_status === "in_progress" && (
                  <>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => { handleTaskAction(selectedTask.id, "complete"); setShowTaskModal(false); }}
                      disabled={updatingTaskId === selectedTask.id}
                    >
                      {updatingTaskId === selectedTask.id ? "Updating..." : "✔ Mark Complete"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => { handleTaskAction(selectedTask.id, "block"); setShowTaskModal(false); }}
                      disabled={updatingTaskId === selectedTask.id}
                    >
                      Block
                    </Button>
                  </>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setShowTaskModal(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
