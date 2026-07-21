"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";

export default function LeaveCalendarPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [leaves, setLeaves] = useState<(LeaveRequest & { employee?: { full_name: string; department: string } })[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchLeaves();
  }, [profile, currentMonth, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLeaves = async () => {
    setFetching(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data: { session } } = await supabase.auth.getSession();
      const url = `/api/workforce/hcm/leaves?status=approved&start_date=${monthStart}&end_date=${monthEnd}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setLeaves(json.leaves || []);
      }
    } catch (err: unknown) {
      console.error("Error fetching leaves:", err);
      toast.error("Failed to load leave calendar");
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getLeavesForDate = (date: Date) => {
    return leaves.filter(leave => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      return date >= start && date <= end;
    });
  };

  const getLeaveColor = (leaveType: string) => {
    const colors: Record<string, string> = {
      casual: "bg-blue-100 text-blue-700",
      sick: "bg-red-100 text-red-700",
      earned: "bg-green-100 text-green-700",
      maternity: "bg-purple-100 text-purple-700",
      paternity: "bg-indigo-100 text-indigo-700",
      unpaid: "bg-gray-100 text-gray-700",
    };
    return colors[leaveType] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Calendar</h1>
          <p className="text-gray-500">Team leave overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            ← Previous
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            Next →
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayLeaves = getLeavesForDate(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  className={`min-h-[80px] p-1 border rounded-lg ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  } ${isToday ? "ring-2 ring-brand-primary" : ""}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isCurrentMonth ? "text-gray-700" : "text-gray-400"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeaves.slice(0, 2).map(leave => (
                      <div
                        key={leave.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${getLeaveColor(leave.leave_type)}`}
                        title={`${leave.employee?.full_name}: ${leave.leave_type}`}
                      >
                        {leave.employee?.full_name?.split(" ")[0]}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <div className="text-[10px] text-gray-500 px-1">
                        +{dayLeaves.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {fetching ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Approved Leaves This Month</h3>
            {leaves.length === 0 ? (
              <p className="text-xs text-gray-500">No approved leaves for this month</p>
            ) : (
              <div className="space-y-2">
                {leaves.map(leave => (
                  <div key={leave.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{leave.employee?.full_name}</span>
                      <span className="text-gray-500 ml-2">({leave.employee?.department})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getLeaveColor(leave.leave_type)}>
                        {leave.leave_type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-gray-500">
                        {leave.start_date}
                        {leave.end_date && leave.end_date !== leave.start_date && ` → ${leave.end_date}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  employee?: {
    full_name: string;
    department: string;
  };
}
