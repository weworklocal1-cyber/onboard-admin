"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, addMonths, subMonths, isToday, isSameMonth } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  creator?: { full_name: string };
  assignees?: Array<{
    employee?: { full_name: string };
    status: string;
  }>;
}

export default function TaskCalendarPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarDays, setCalendarDays] = useState<Record<string, Task[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [fetching, setFetching] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    if (!profile) return;
    fetchCalendarData();
  }, [profile, year, month]);

  const fetchCalendarData = async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/tasks/calendar?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setCalendarDays(json.calendarDays || {});
        setSelectedDay(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load calendar");
      }
    } catch (err) {
      console.error("Error fetching calendar:", err);
      toast.error("Failed to load calendar");
    } finally {
      setFetching(false);
    }
  };

  const getDaysInMonth = () => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateKey,
        tasks: calendarDays[dateKey] || [],
      });
    }

    return days;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved': return 'bg-green-100 text-green-700';
      case 'in_progress':
      case 'in_review': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
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

  const days = getDaysInMonth();
  const selectedTasks = selectedDay ? (calendarDays[selectedDay] || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Calendar</h1>
          <p className="text-gray-500">View tasks by due date</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-white border rounded-lg font-semibold min-w-[200px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((dayInfo, idx) => (
                  <div
                    key={idx}
                    className={`
                      min-h-[80px] p-1.5 rounded-lg border transition-colors
                      ${dayInfo ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'}
                      ${selectedDay === dayInfo?.dateKey ? 'ring-2 ring-brand-primary' : ''}
                      ${isToday(new Date(year, month - 1, dayInfo?.day || 1)) ? 'bg-blue-50' : ''}
                    `}
                    onClick={() => dayInfo && setSelectedDay(dayInfo.dateKey)}
                  >
                    {dayInfo && (
                      <>
                        <div className={`text-xs font-medium mb-1 ${isToday(new Date(year, month - 1, dayInfo.day)) ? 'text-brand-primary font-bold' : 'text-gray-700'}`}>
                          {dayInfo.day}
                        </div>
                        <div className="space-y-0.5">
                          {dayInfo.tasks.slice(0, 2).map((task: Task) => (
                            <div
                              key={task.id}
                              className="text-[10px] px-1 py-0.5 rounded bg-brand-primary/10 text-brand-primary truncate"
                            >
                              {task.title}
                            </div>
                          ))}
                          {dayInfo.tasks.length > 2 && (
                            <div className="text-[10px] text-gray-500 px-1">
                              +{dayInfo.tasks.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDay ? format(new Date(selectedDay + 'T00:00:00'), "MMMM d, yyyy") : "Select a day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Click on a calendar day to view tasks due on that date
                </p>
              ) : selectedTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No tasks due on this day
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedTasks.map((task: Task) => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg border">
                      <p className="font-medium text-sm mb-2">{task.title}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge className={`text-[10px] ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        <Badge className={`text-[10px] ${getStatusColor(task.status)}`}>
                          {task.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {task.assignees && task.assignees.length > 0 && (
                        <p className="text-xs text-gray-600">
                          Assigned to: {task.assignees.map(a => a.employee?.full_name).filter(Boolean).join(", ")}
                        </p>
                      )}
                      {task.creator && (
                        <p className="text-xs text-gray-500 mt-1">
                          Created by: {task.creator.full_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                  <span className="text-xs">Urgent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                  <span className="text-xs">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                  <span className="text-xs">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                  <span className="text-xs">Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
