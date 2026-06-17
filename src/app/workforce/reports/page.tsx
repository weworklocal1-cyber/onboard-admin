"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Profile, HrDocument, HrDocumentType, HR_DOCUMENT_LABELS, AttendanceStatus, TaskPriority } from "@/types/workforce";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

type Period = "today" | "week" | "month";

export default function ReportsPage() {
  const { profile } = useAuth();
  const { isAdmin: checkAdmin } = usePermissions();
  const supabase = createClient();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, late: 0, absent: 0, onLeave: 0 });
  const [taskStats, setTaskStats] = useState({ urgent: 0, overdue: 0, completed: 0, total: 0 });
  const [restaurantStats, setRestaurantStats] = useState({ new: 0, interested: 0, onboarding: 0, live: 0 });
  const [moodStats, setMoodStats] = useState<Record<string, number>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("today");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedType, setSelectedType] = useState<HrDocumentType>("offer_letter");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchData();
    fetchAnalytics();
  }, [profile, supabase, selectedPeriod]);

  const fetchData = async () => {
    const [{ data: empData }, { data: docData }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("hr_documents")
        .select("*, employee:profiles!employee_id(full_name), uploader:profiles!uploaded_by(full_name)")
        .order("created_at", { ascending: false }),
    ]);
    setEmployees(empData || []);
    setDocuments(docData || []);
  };

  const fetchAnalytics = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    let startDate = today;
    let endDate = today;

    if (selectedPeriod === "week") {
      startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
      endDate = format(endOfWeek(new Date()), "yyyy-MM-dd");
    } else if (selectedPeriod === "month") {
      startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
    }

    const [{ data: attData }, { data: taskData }, { data: restData }, { data: dailyData }] = await Promise.all([
      supabase.from("attendance").select("status").gte("date", startDate).lte("date", endDate),
      supabase.from("tasks").select("status, priority, due_date").neq("status", "completed"),
      supabase.from("restaurants").select("status"),
      supabase.from("daily_updates").select("mood").gte("date", startDate).lte("date", endDate),
    ]);

    setAttendanceStats({
      present: attData?.filter((a: any) => a.status === "present").length || 0,
      late: attData?.filter((a: any) => a.status === "late").length || 0,
      absent: attData?.filter((a: any) => a.status === "absent").length || 0,
      onLeave: attData?.filter((a: any) => a.status === "on_leave").length || 0,
    });

    setTaskStats({
      urgent: taskData?.filter((t: any) => t.priority === "urgent").length || 0,
      overdue: taskData?.filter((t: any) => t.due_date && new Date(t.due_date) < new Date()).length || 0,
      completed: 0,
      total: taskData?.length || 0,
    });

    setRestaurantStats({
      new: restData?.filter((r: any) => r.status === "new_lead").length || 0,
      interested: restData?.filter((r: any) => r.status === "interested").length || 0,
      onboarding: restData?.filter((r: any) => r.status === "onboarding_in_progress").length || 0,
      live: restData?.filter((r: any) => r.status === "live").length || 0,
    });

    const moodCounts: Record<string, number> = {};
    dailyData?.forEach((d: any) => {
      if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
    });
    setMoodStats(moodCounts);
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedEmployee || !profile) return;

    setLoading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${selectedEmployee}/${selectedType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('hr_documents')
        .insert({
          employee_id: selectedEmployee,
          document_type: selectedType,
          file_url: urlData.publicUrl,
          file_name: uploadFile.name,
          uploaded_by: profile.id,
        });

      if (insertError) throw insertError;

      setUploadFile(null);
      const { data } = await supabase.from('hr_documents')
        .select("*, employee:profiles!employee_id(full_name), uploader:profiles!uploaded_by(full_name)")
        .order('created_at', { ascending: false });
      setDocuments(data || []);
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : "Upload failed"));
    }
    setLoading(false);
  };

  if (!profile) return null;

  const canManageDocs = checkAdmin(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Present" value={attendanceStats.present} color="emerald" />
        <StatsCard title="Late" value={attendanceStats.late} color="amber" />
        <StatsCard title="Absent" value={attendanceStats.absent} color="rose" />
        <StatsCard title="On Leave" value={attendanceStats.onLeave} color="blue" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Urgent Tasks" value={taskStats.urgent} color="rose" />
        <StatsCard title="Overdue" value={taskStats.overdue} color="orange" />
        <StatsCard title="New Leads" value={restaurantStats.new} color="sky" />
        <StatsCard title="Live Restaurants" value={restaurantStats.live} color="green" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Mood Tracker</CardTitle>
          <CardDescription>Average energy levels this {selectedPeriod}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            {Object.entries(moodStats).length > 0 ? (
              Object.entries(moodStats).map(([mood, count]) => (
                <div key={mood} className="text-center">
                  <span className="text-2xl">{mood === "great" ? "🔥" : mood === "good" ? "😊" : mood === "neutral" ? "🙂" : mood === "bad" ? "😐" : "😔"}</span>
                  <p className="text-xs mt-1">{count}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No mood data yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {canManageDocs && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType as (v: string) => void}>
                <SelectTrigger><SelectValue placeholder="Document type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(HR_DOCUMENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button onClick={handleUpload} disabled={!uploadFile || !selectedEmployee || loading}>
              📤 Upload Document
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Document Library</h2>

        {documents.length === 0 ? (
          <p className="text-gray-500">No documents uploaded yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map(doc => (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{doc.file_name}</span>
                    <Badge>{HR_DOCUMENT_LABELS[doc.document_type]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{doc.employee?.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    sky: "text-sky-600",
    green: "text-green-600",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}