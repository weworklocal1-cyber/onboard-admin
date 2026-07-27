"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Award,
  BookOpen,
  Calendar,
  Receipt,
} from "lucide-react";

import { Task, Attendance, DailyUpdate, PRIORITY_COLORS } from "@/types/workforce";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const { isAdmin: checkAdmin } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const userIsAdmin = checkAdmin(profile.role);
  const isOnboarding = profile.role === "onboarding_executive";

  if (userIsAdmin) {
    return <FounderDashboardView profile={profile} />;
  } else if (isOnboarding) {
    return <OnboardingDashboardView profile={profile} />;
  } else {
    return <EmployeeDashboardView profile={profile} />;
  }
}

function FounderDashboardView({ profile: _profile }: { profile: any }) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    attendance: { present: 0, absent: 0, late: 0, onLeave: 0 },
    restaurants: { newLeads: 0, followUp: 0, onboarding: 0, live: 0, total: 0 },
    blockers: { active: 0 },
    tasks: { urgent: 0, overdue: 0 },
    campaigns: { active: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");

        const [
          { data: attendanceData },
          { data: restData },
          { data: taskData },
          { data: campaignData },
          { count: blockerCount },
        ] = await Promise.all([
          supabase.from("attendance").select("status").eq("date", todayStr),
          supabase.from("restaurants").select("status"),
          supabase.from("tasks").select("status, priority, due_date"),
          supabase.from("marketing_campaigns").select("status"),
          supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "blocked"),
        ]);

        setStats({
          attendance: {
            present: attendanceData?.filter((a: any) => a.status === "present").length || 0,
            absent: attendanceData?.filter((a: any) => a.status === "absent").length || 0,
            late: attendanceData?.filter((a: any) => a.status === "late").length || 0,
            onLeave: attendanceData?.filter((a: any) => a.status === "on_leave").length || 0,
          },
          restaurants: {
            newLeads: restData?.filter((r: any) => r.status === "new_lead").length || 0,
            followUp: restData?.filter((r: any) => r.status === "follow_up_required").length || 0,
            onboarding: restData?.filter((r: any) => r.status === "onboarding_in_progress").length || 0,
            live: restData?.filter((r: any) => r.status === "live").length || 0,
            total: restData?.length || 0,
          },
          blockers: { active: blockerCount || 0 },
          tasks: {
            urgent: taskData?.filter((t: any) => t.priority === "urgent" && t.status !== "completed").length || 0,
            overdue: taskData?.filter((t: any) =>
              t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date()
            ).length || 0,
          },
          campaigns: {
            active: campaignData?.filter((c: any) => c.status === "active").length || 0,
          },
        });
      } catch (err: any) {
        console.error("Founder dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Founder Operations Dashboard</h1>
          <p className="text-gray-500">Real-time status overview of LocalWala workforce and acquisitions.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workforce/reports"><Button variant="outline" size="sm">📊 Analytics</Button></Link>
          <Link href="/workforce/employees"><Button size="sm">➕ Add Employee</Button></Link>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-800">👥 Attendance Status (Today)</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Present Today" value={stats.attendance.present} description="Checked in" icon={<CheckCircle2 className="text-emerald-600 h-5 w-5" />} color="emerald" />
        <MetricCard title="Late Arrivals" value={stats.attendance.late} description="After 10:30 AM" icon={<Clock className="text-amber-500 h-5 w-5" />} color="amber" />
        <MetricCard title="On Approved Leave" value={stats.attendance.onLeave} description="Scheduled leave" icon={<TrendingUp className="text-blue-500 h-5 w-5" />} color="blue" />
        <MetricCard title="Absent / Not Checked In" value={stats.attendance.absent} description="Action required" icon={<AlertCircle className="text-rose-500 h-5 w-5" />} color="rose" />
      </div>

      <h2 className="text-lg font-semibold text-gray-800">🍽️ Restaurant Acquisition Funnel</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Leads" value={stats.restaurants.total} description="In pipeline" icon={<BarChart3 className="text-slate-600 h-5 w-5" />} color="slate" />
        <MetricCard title="New Leads" value={stats.restaurants.newLeads} description="Unassigned / Fresh" icon={<PlusCircle className="text-sky-500 h-5 w-5" />} color="sky" />
        <MetricCard title="Onboarding" value={stats.restaurants.onboarding} description="Document collection" icon={<MapPin className="text-purple-500 h-5 w-5" />} color="purple" />
        <MetricCard title="Active Live" value={stats.restaurants.live} description="On delivery platform" icon={<CheckCircle2 className="text-green-600 h-5 w-5" />} color="green" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-primary" /> Tasks & Alerts
            </CardTitle>
            <CardDescription>Actions requiring management response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">Urgent Active Tasks</span>
              </div>
              <Badge className="bg-red-600 hover:bg-red-700">{stats.tasks.urgent}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">Overdue Task Items</span>
              </div>
              <Badge className="bg-amber-600 hover:bg-amber-700">{stats.tasks.overdue}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Blocked Employee Workflows</span>
              </div>
              <Badge className="bg-purple-600 hover:bg-purple-700">{stats.blockers.active}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg">📢 Active Campaigns</CardTitle>
            <CardDescription>Social media and marketing tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Active Campaigns:</span>
              <Badge className="bg-green-100 text-green-700 font-semibold">{stats.campaigns.active} Running</Badge>
            </div>
            <div className="pt-2 text-center">
              <Link href="/workforce/campaigns"><Button className="w-full text-xs font-semibold">Manage Campaigns</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OnboardingDashboardView({ profile }: { profile: any }) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    newLeads: 0,
    contacted: 0,
    onboarding: 0,
    live: 0,
  });
  const [myFollowups, setMyFollowups] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        const [
          { data: restaurants },
          { data: followups },
          { data: lbData },
        ] = await Promise.all([
          supabase.from("restaurants").select("status").eq("assigned_executive_id", profile.id),
          supabase
            .from("follow_ups")
            .select("*, restaurant:restaurants(name, locality)")
            .eq("assigned_to", profile.id)
            .eq("status", "pending")
            .order("scheduled_at", { ascending: true })
            .limit(4),
          supabase
            .from("restaurant_interactions")
            .select("executive_id, outcome, restaurant:restaurants!inner(status)")
            .eq("outcome", "interested")
            .limit(10),
        ]);

        const conversionMap: Record<string, number> = {};
        lbData?.forEach((i: any) => {
          conversionMap[i.executive_id] = (conversionMap[i.executive_id] || 0) + 1;
        });
        const lbEntries = Object.entries(conversionMap)
          .map(([id, conv]) => ({ executive_id: id, conversions: conv }))
          .sort((a, b) => b.conversions - a.conversions)
          .slice(0, 5);
        setLeaderboard(lbEntries);

        setStats({
          newLeads: restaurants?.filter((r) => r.status === "new_lead").length || 0,
          contacted: restaurants?.filter((r) => r.status === "contacted" || r.status === "interested").length || 0,
          onboarding: restaurants?.filter((r) => r.status === "onboarding_in_progress" || r.status === "documents_pending").length || 0,
          live: restaurants?.filter((r) => r.status === "live" || r.status === "onboarded").length || 0,
        });
        setMyFollowups(followups || []);
      } catch (err: any) {
        console.error("Onboarding Dashboard loading error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [profile, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Onboarding Dashboard</h1>
        <p className="text-gray-500">Welcome back, {profile.full_name}. Manage your pipeline and visits today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="My Leads" value={stats.newLeads} description="Awaiting contact" icon={<PlusCircle className="text-indigo-500 h-5 w-5" />} color="indigo" />
        <MetricCard title="Contacted / Interested" value={stats.contacted} description="Active discussions" icon={<TrendingUp className="text-amber-500 h-5 w-5" />} color="amber" />
        <MetricCard title="Onboarding Pending" value={stats.onboarding} description="Document collection" icon={<ClipboardList className="text-purple-500 h-5 w-5" />} color="purple" />
        <MetricCard title="Onboarded Live" value={stats.live} description="Successful closures" icon={<CheckCircle2 className="text-emerald-500 h-5 w-5" />} color="emerald" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" /> Territory & Restaurant Discovery
            </CardTitle>
            <CardDescription>Find and add restaurants to CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Use the territory map to discover restaurants in your assigned area.
            </p>
            <Link href="/workforce/territories"><Button className="w-full">Open Territory Map</Button></Link>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-primary" /> Upcoming Follow-ups Today
            </CardTitle>
            <CardDescription>Scheduled interactions with shop owners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
           {myFollowups.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">🎉 No follow-ups scheduled! Happy hunting.</p>
            ) : (
              myFollowups.map((f) => (
                <div key={f.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{f.restaurant?.name}</h4>
                    <p className="text-xs text-gray-500">📍 {f.restaurant?.locality || "General"}</p>
                    <p className="text-xxs text-gray-400 mt-1">Note: {f.notes || "No notes added"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="capitalize text-xxs font-bold mb-1 block w-fit ml-auto">
                      📞 {f.follow_up_type}
                    </Badge>
                    <span className="text-xs text-brand-primary font-bold">
                      {format(new Date(f.scheduled_at), "hh:mm a")}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Link href="/workforce/follow-ups"><Button className="w-full text-xs font-semibold">All Schedule Items</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" /> Field Visit Actions
            </CardTitle>
            <CardDescription>Log a physical visit to lock location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              When visiting restaurant owners, click &apos;New Interaction&apos; from the restaurant list page to verify GPS coordinates and upload menu photos.
            </p>
            <Link href="/workforce/restaurants"><Button className="w-full">📋 Restaurant List</Button></Link>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" /> Weekly Leaderboard
            </CardTitle>
            <CardDescription>Conversions this week</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No conversions recorded yet</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <li key={entry.executive_id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${idx === 0 ? "text-amber-600" : "text-gray-500"}`}>#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{entry.executive_id === profile.id ? "You" : "Teammate"}</span>
                    </div>
                    <Badge className="bg-brand-primary text-white font-semibold">{entry.conversions} conversions</Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboardView({ profile }: { profile: any }) {
  const supabase = createClient();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyUpdate, setDailyUpdate] = useState<DailyUpdate | null>(null);
  const [leaveBalance, setLeaveBalance] = useState({ casual: 0, sick: 0, earned: 0 });
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");

        const [
          { data: attData },
          { data: taskData },
          { data: updateData },
          { data: leaveBalData },
          { data: pendingLeaveData },
          { data: pendingExpData },
        ] = await Promise.all([
          supabase.from("attendance").select("*").eq("employee_id", profile.id).eq("date", todayStr).maybeSingle(),
          supabase.from("tasks").select("*").eq("assigned_to", profile.id).neq("status", "completed").order("priority", { ascending: false }).limit(5),
          supabase.from("daily_updates").select("*").eq("employee_id", profile.id).eq("date", todayStr).maybeSingle(),
          supabase.from("leave_balances").select("leave_type, total_allocated, used, remaining").eq("employee_id", profile.id),
          supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("employee_id", profile.id).eq("status", "pending"),
          supabase.from("expenses").select("id", { count: "exact", head: true }).eq("employee_id", profile.id).eq("status", "pending"),
        ]);

        const leaveBal = (leaveBalData || []) as Array<{ leave_type: string; remaining: number }>;
        setAttendance(attData as Attendance);
        setTasks(taskData || []);
        setDailyUpdate(updateData as DailyUpdate);
        setLeaveBalance({
          casual: leaveBal.find(l => l.leave_type === "casual")?.remaining || 0,
          sick: leaveBal.find(l => l.leave_type === "sick")?.remaining || 0,
          earned: leaveBal.find(l => l.leave_type === "earned")?.remaining || 0,
        });
        setPendingLeaves(pendingLeaveData?.length || 0);
        setPendingExpenses(pendingExpData?.length || 0);
      } catch (err: any) {
        console.error("Employee dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [profile, supabase]);

  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            My Workspace
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back, <span className="font-semibold text-gray-900">{profile.full_name}</span>. Here is your overview for {todayFormatted}.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/workforce/attendance">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Attendance</p>
                <p className="text-xs text-gray-500">Clock in / out</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/workforce/leaves">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Apply Leave</p>
                <p className="text-xs text-gray-500">Request time off</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/workforce/expenses">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Expenses</p>
                <p className="text-xs text-gray-500">Submit claim</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {profile.role === 'team_lead' || profile.role === 'hr_admin' || profile.role === 'super_admin' || profile.role === 'founder' ? (
          <Link href="/workforce/approvals">
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-amber-200 bg-amber-50/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Approvals</p>
                  <p className="text-xs text-gray-500">Review requests</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/workforce/tasks">
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">My Tasks</p>
                  <p className="text-xs text-gray-500">View assignments</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Active Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            <Link href="/workforce/tasks"><Button variant="link" className="p-0 h-auto text-xs text-brand-primary">View all →</Button></Link>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Leaves</p>
            <p className="text-2xl font-bold text-amber-600">{pendingLeaves}</p>
            {pendingLeaves > 0 && <Link href="/workforce/leaves"><Button variant="link" className="p-0 h-auto text-xs text-brand-primary">Review →</Button></Link>}
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Expenses</p>
            <p className="text-2xl font-bold text-green-600">{pendingExpenses}</p>
            {pendingExpenses > 0 && <Link href="/workforce/expenses"><Button variant="link" className="p-0 h-auto text-xs text-brand-primary">Review →</Button></Link>}
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">CL Balance</p>
            <p className="text-2xl font-bold text-gray-900">{leaveBalance.casual}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">SL Balance</p>
            <p className="text-2xl font-bold text-gray-900">{leaveBalance.sick}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="border-gray-200 shadow-sm md:col-span-4">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center justify-between">
              <span>Today&apos;s Shift</span>
              <Badge variant={attendance ? (attendance.status === "present" || attendance.status === "wfh" ? "success" : "warning") : "secondary"}>
                {attendance ? attendance.status : "Not Checked In"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              {attendance 
                ? attendance.check_in_time 
                  ? `Checked in at ${format(new Date(attendance.check_in_time!), "hh:mm a")}`
                  : "Shift active but no check-in time recorded."
                : "You have not checked in for today. Please clock in to start your shift."}
            </p>
            <Link href="/workforce/attendance">
              <Button className="w-full text-xs font-semibold">
                {attendance && attendance.check_out_time ? "View Shift" : "Go to Attendance"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm md:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-brand-primary" /> Active Tasks ({tasks.length})
              </CardTitle>
              <CardDescription>Tasks assigned to you that are not yet completed</CardDescription>
            </div>
            <Link href="/workforce/tasks"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">🎉 No active tasks. Enjoy your day!</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isOverdue = task.due_date && task.due_date < format(new Date(), "yyyy-MM-dd") && task.status !== "completed";
                  return (
                    <Link key={task.id} href={`/workforce/tasks`} className="block">
                      <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${isOverdue ? "border-red-200 bg-red-50/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-800 truncate">{task.title}</h4>
                          {task.due_date && (
                            <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                              📅 Due {format(new Date(task.due_date), "MMM d")}
                              {isOverdue && <span className="ml-1.5 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold uppercase">Overdue</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Badge className={`${PRIORITY_COLORS[task.priority] || "bg-gray-100"} text-[10px] font-medium`}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {task.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg">📝 Daily EOD Update</CardTitle>
            <CardDescription>Submit your Daily updates before leaving shift</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <p className="text-sm text-gray-600">
              {dailyUpdate 
                ? "✅ You have submitted your end-of-day update report for today."
                : "⚠️ You have not submitted your EOD update report yet. Please log your work output before checkout."}
            </p>
            <Link href="/workforce/daily-updates">
              <Button variant={dailyUpdate ? "outline" : "default"}>
                {dailyUpdate ? "View Submission" : "Submit Update"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">WeWorkLocal Academy</h3>
              <p className="text-sm text-white/80">
                Complete the Understanding Local Commerce course to prepare for internships and earn your certificate.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href="/academy/courses">
              <button className="bg-white text-emerald-700 hover:bg-white/90 px-4 py-2 rounded-lg text-sm font-semibold">
                Browse Certifications
              </button>
            </a>
            <a href="/academy/dashboard">
              <button className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2 rounded-lg text-sm font-semibold border border-white/30">
                Open Academy
              </button>
            </a>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  color 
}: { 
  title: string; 
  value: number; 
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMaps: Record<string, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    rose: "text-rose-700",
    slate: "text-slate-800",
    sky: "text-sky-700",
    purple: "text-purple-700",
    indigo: "text-indigo-700",
    green: "text-green-700",
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-extrabold ${colorMaps[color] || "text-gray-900"}`}>{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}