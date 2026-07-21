"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, ClipboardList } from "lucide-react";

export default function TeamsDashboardPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [attendance, setAttendance] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyUpdate, setDailyUpdate] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.id) return;
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const [{ data: attData }, { data: taskData }, { data: updateData }] = await Promise.all([
        supabase.from("attendance").select("*").eq("employee_id", profile.id).eq("date", todayStr).maybeSingle(),
        supabase.from("tasks").select("*").eq("assigned_to", profile.id).neq("status", "completed").order("priority", { ascending: false }).limit(3),
        supabase.from("daily_updates").select("*").eq("employee_id", profile.id).eq("date", todayStr).maybeSingle(),
      ]);

      setAttendance(attData);
      setTasks(taskData || []);
      setDailyUpdate(updateData);
    } catch (err: any) {
      console.error("Teams dashboard error:", err.message);
    } finally {
      setLoadingData(false);
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Hello, {profile.full_name}</h1>
        <p className="text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-gray-500">Tasks in progress</p>
          </CardContent>
        </Card>
      </div>

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Urgent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.filter(t => t.priority === "urgent").length === 0 ? (
            <p className="text-xs text-gray-500">No urgent tasks</p>
          ) : (
            tasks.filter(t => t.priority === "urgent").map(task => (
              <div key={task.id} className="text-xs p-2 bg-red-50 rounded">
                <p className="font-medium">{task.title}</p>
                {task.due_date && (
                  <p className="text-gray-500">Due: {task.due_date}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
