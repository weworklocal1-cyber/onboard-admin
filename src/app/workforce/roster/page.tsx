"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Shield, Calendar, User, MapPin, FileText } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
};

type ShiftTemplate = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  days: number[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Employee = {
  id: string;
  full_name: string;
  department: string | null;
  work_preferences?: {
    work_type: string;
    days_per_week: number;
    preferred_shift_start: string | null;
    preferred_shift_end: string | null;
    working_days: number[];
  } | null;
};

type Assignment = {
  id: string;
  employee_id: string;
  shift_id: string;
  date: string;
  shift: Shift;
  employee: Employee;
  is_leave?: boolean;
  leave_type?: string;
  location?: string;
  recurrence_pattern?: {
    frequency: 'weekly' | 'biweekly';
    days: number[];
  } | null;
  parent_assignment_id?: string | null;
  is_recurring_instance?: boolean;
};

type SwapRequest = {
  id: string;
  assignment_id: string;
  requested_by: string;
  target_employee_id: string | null;
  reason: string | null;
  status: string;
  reviewed_at: string | null;
  notes: string | null;
  assignment: {
    id: string;
    date: string;
    shift: Shift;
    employee: Employee;
  };
  requester: {
    id: string;
    full_name: string;
    department: string | null;
  };
  target: {
    id: string;
    full_name: string;
    department: string | null;
  } | null;
};

type CoverageRequest = {
  id: string;
  assignment_id: string;
  covered_by: string;
  requested_by: string;
  reason: string | null;
  status: string;
  reviewed_at: string | null;
  notes: string | null;
  assignment: {
    id: string;
    date: string;
    shift: Shift;
    employee: Employee;
  };
  coverer: {
    id: string;
    full_name: string;
    department: string | null;
  };
  requester: {
    id: string;
    full_name: string;
    department: string | null;
  };
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ViewMode = "schedule" | "swaps" | "coverage" | "my-schedule" | "requests";

const supabase = createClient();

export default function RosterPage() {
  const { profile, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  });
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [coverages, setCoverages] = useState<CoverageRequest[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [loadingCoverages, setLoadingCoverages] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const initializedView = useRef(false);

  const [assignForm, setAssignForm] = useState({
    employee_id: "",
    shift_id: "",
    date: todayStr,
    is_leave: false,
    leave_type: "",
    location: "office",
    recurrence_pattern: null as { frequency: 'weekly' | 'biweekly'; days: number[] } | null,
    start_date: "",
    end_date: "",
  });

  const [swapForm, setSwapForm] = useState({
    assignment_id: "",
    target_employee_id: "",
    reason: "",
  });

  const [coverageForm, setCoverageForm] = useState({
    assignment_id: "",
    covered_by: "",
    reason: "",
  });

  const [requestForm, setRequestForm] = useState({
    shift_id: "",
    date: todayStr,
    is_leave: false,
    leave_type: "",
    location: "office",
    recurrence_pattern: null as { frequency: 'weekly' | 'biweekly'; days: number[] } | null,
    notes: "",
  });

  const isManager = profile ? ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role) : false;

  useEffect(() => {
    if (!authLoading && profile && !initializedView.current) {
      initializedView.current = true;
      if (!isManager) {
        setViewMode("my-schedule");
      }
    }
  }, [profile, authLoading, isManager]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
  }, [weekStart]);

  useEffect(() => {
    if (authLoading || !profile) return;
    let active = true;
    setLoading(true);

    async function load() {
      const errors: string[] = [];

      const { data: shiftsData, error: shiftsError } = await supabase.from("shifts").select("*").order("start_time");
      if (shiftsError) {
        toast.error(`Failed to load shifts: ${shiftsError.message}`);
        errors.push("shifts");
      } else if (!shiftsData) {
        errors.push("shifts");
      }

      const { data: employeesData, error: employeesError } = await supabase.from("profiles").select("id, full_name, department").order("full_name");
      if (employeesError) {
        toast.error(`Failed to load employees: ${employeesError.message}`);
        errors.push("profiles");
      } else if (!employeesData) {
        errors.push("profiles");
      }

      const { data: prefsData, error: prefsError } = await supabase
        .from("employee_work_preferences")
        .select("*");
      if (prefsError) {
        console.warn("Failed to load work preferences:", prefsError.message);
        errors.push("work_preferences");
      }

      const { data: templatesData, error: templatesError } = await supabase
        .from("shift_templates")
        .select("*")
        .order("name");
      if (templatesError) {
        console.warn("Failed to load shift templates:", templatesError.message);
        errors.push("shift_templates");
      }

      const start = weekDates[0];
      const end = weekDates[6];
      const { data: rosterData, error: rosterError } = await supabase
        .from("roster_assignments")
        .select(`
          *, 
          shift:shifts(*), 
          employee:profiles!employee_id(id, full_name, department)
        `)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (rosterError) {
        toast.error(`Failed to load roster assignments: ${rosterError.message}`);
      }

      if (active) {
        const prefsMap = new Map((prefsData || []).map((p: any) => [p.employee_id, p]));
        const enriched = (employeesData || []).map((emp: any) => ({
          ...emp,
          work_preferences: prefsMap.get(emp.id) || null,
        }));

        setShifts(shiftsData || []);
        setEmployees(enriched);
        setAssignments(rosterData || []);
        setShiftTemplates(templatesData || []);

        if (errors.length > 0) {
          toast.error(`Some data failed to load: ${errors.join(", ")}`);
        }

        const myCount = (rosterData || []).filter((a: any) => a.employee_id === profile!.id).length;
        if (myCount === 0 && !rosterError && rosterData !== null) {
          toast.info("No shifts assigned to you for this week");
        }

        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [profile, authLoading, weekStart]);

  const fetchSwaps = async () => {
    setLoadingSwaps(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/swaps?assignment_id=${selectedAssignment || ""}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSwaps(json.swaps || []);
      }
    } catch {
      toast.error("Failed to load swap requests");
    } finally {
      setLoadingSwaps(false);
    }
  };

  const fetchCoverages = async () => {
    setLoadingCoverages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/coverage?assignment_id=${selectedAssignment || ""}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCoverages(json.coverage || []);
      }
    } catch {
      toast.error("Failed to load coverage requests");
    } finally {
      setLoadingCoverages(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/requests`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests || []);
      }
    } catch {
      toast.error("Failed to load schedule requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (viewMode === "swaps") fetchSwaps();
    if (viewMode === "coverage") fetchCoverages();
    if (viewMode === "requests") fetchRequests();
  }, [viewMode]);

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.employee_id || !assignForm.date) {
      toast.error("Employee and date are required");
      return;
    }

    if (assignForm.is_leave && !assignForm.leave_type) {
      toast.error("Leave type is required");
      return;
    }

    setSaving(true);
    setConflicts([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/roster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          employee_id: assignForm.employee_id,
          shift_id: assignForm.shift_id || null,
          date: assignForm.date,
          is_leave: assignForm.is_leave,
          leave_type: assignForm.leave_type || null,
          location: assignForm.location || null,
          recurrence_pattern: assignForm.recurrence_pattern,
          start_date: assignForm.start_date || assignForm.date,
          end_date: assignForm.end_date || assignForm.date,
          expand_recurring: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign");
      }

      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        toast.warning(`Assigned with ${data.conflicts.length} conflict(s)`);
      } else {
        toast.success(data.assignments?.length > 1 ? `Recurring schedule created (${data.assignments.length} occurrences)` : "Shift assigned");
      }

      setAssignments((prev) => [...prev, ...(data.assignments || [])]);
      setShowAssignModal(false);
      setAssignForm({ employee_id: "", shift_id: "", date: todayStr, is_leave: false, leave_type: "", location: "office", recurrence_pattern: null, start_date: "", end_date: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  const handleSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapForm.assignment_id) {
      toast.error("Please select a shift to swap");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/roster/swaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(swapForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to request swap");
      }

      toast.success("Swap request submitted");
      setShowSwapModal(false);
                setSwapForm({ assignment_id: "", target_employee_id: "", reason: "" });
      fetchSwaps();
    } catch (err: any) {
      toast.error(err.message || "Failed to request swap");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverageRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverageForm.assignment_id || !coverageForm.covered_by) {
      toast.error("Please select a shift and coverer");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/roster/coverage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(coverageForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to request coverage");
      }

      toast.success("Coverage request submitted");
      setShowCoverageModal(false);
      setCoverageForm({ assignment_id: "", covered_by: "", reason: "" });
      fetchCoverages();
    } catch (err: any) {
      toast.error(err.message || "Failed to request coverage");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.date) {
      toast.error("Date is required");
      return;
    }

    if (requestForm.is_leave && !requestForm.leave_type) {
      toast.error("Leave type is required");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/roster/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          shift_id: requestForm.shift_id || null,
          date: requestForm.date,
          is_leave: requestForm.is_leave,
          leave_type: requestForm.leave_type || null,
          location: requestForm.location,
          recurrence_pattern: requestForm.recurrence_pattern,
          start_date: requestForm.date,
          end_date: requestForm.date,
          notes: requestForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      toast.success("Schedule request submitted for approval");
      setShowRequestModal(false);
      setRequestForm({ shift_id: "", date: todayStr, is_leave: false, leave_type: "", location: "office", recurrence_pattern: null, notes: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve request");
      }

      toast.success("Schedule request approved");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve request");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reject request");
      }

      toast.success("Schedule request rejected");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSwap = async (swapId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/swaps/${swapId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve swap");
      }

      toast.success("Swap request approved");
      fetchSwaps();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve swap");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSwap = async (swapId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/swaps/${swapId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reject swap");
      }

      toast.success("Swap request rejected");
      fetchSwaps();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject swap");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveCoverage = async (coverageId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/coverage/${coverageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve coverage");
      }

      toast.success("Coverage request approved");
      fetchCoverages();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve coverage");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectCoverage = async (coverageId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/roster/coverage/${coverageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reject coverage");
      }

      toast.success("Coverage request rejected");
      fetchCoverages();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject coverage");
    } finally {
      setSaving(false);
    }
  };

  function getAssignmentsForDate(date: string) {
    if (viewMode === "my-schedule" && profile) {
      return assignments.filter((a) => a.date === date && a.employee_id === profile.id);
    }
    return assignments.filter((a) => a.date === date);
  }

  const selectedEmployee = employees.find((e) => e.id === assignForm.employee_id);
  const selectedPref = selectedEmployee?.work_preferences;

  const myAssignments = useMemo(() => {
    if (!profile) return [];
    return assignments
      .filter((a) => a.employee_id === profile.id)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [assignments, profile]);

  const pendingSwaps = swaps.filter((s) => s.status === "pending");
  const pendingCoverages = coverages.filter((c) => c.status === "pending");
  const pendingRequests = requests.filter((r: any) => r.status === "pending");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Roster</h1>
          <p className="text-sm text-gray-500">
            {viewMode === "my-schedule" ? "Your schedule" : viewMode === "requests" ? "Schedule requests" : "Schedule, swaps, and coverage"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={viewMode === "schedule" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("schedule")}
              className="rounded-none"
            >
              <Calendar className="h-4 w-4 mr-1" /> Schedule
            </Button>
            <Button
              variant={viewMode === "my-schedule" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("my-schedule")}
              className="rounded-none"
            >
              <User className="h-4 w-4 mr-1" /> My Schedule
            </Button>
            {isManager && (
              <>
                <Button
                  variant={viewMode === "swaps" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("swaps")}
                  className="rounded-none relative"
                >
                  Swaps
                  {pendingSwaps.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                      {pendingSwaps.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant={viewMode === "coverage" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("coverage")}
                  className="rounded-none relative"
                >
                  <Shield className="h-4 w-4 mr-1" /> Coverage
                  {pendingCoverages.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                      {pendingCoverages.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant={viewMode === "requests" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("requests")}
                  className="rounded-none relative"
                >
                  Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                      {pendingRequests.length}
                    </span>
                  )}
                </Button>
              </>
            )}
          </div>

          {(viewMode === "schedule") && (
            <>
              <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => {
                const newDate = new Date(d);
                newDate.setDate(newDate.getDate() - 7);
                return newDate;
              })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {weekDates[0]} → {weekDates[6]}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => {
                const newDate = new Date(d);
                newDate.setDate(newDate.getDate() + 7);
                return newDate;
              })}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {isManager && viewMode === "schedule" && (
            <Button size="sm" onClick={() => setShowAssignModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Assign
            </Button>
          )}

          {!isManager && viewMode === "my-schedule" && (
            <Button size="sm" onClick={() => setShowRequestModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Request Schedule
            </Button>
          )}
        </div>
      </div>

      {viewMode === "schedule" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-500">Employee</th>
                    {DAYS.map((day, i) => (
                      <th key={day} className="p-3 font-medium text-gray-500 text-center">
                        <div>{day}</div>
                        <div className="text-[10px] font-normal text-gray-400">
                          {new Date(weekDates[i]).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto" />
                      </td>
                    </tr>
                  ) : (viewMode === "schedule" ? employees : employees.filter((e) => profile && e.id === profile.id)).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    (viewMode === "schedule" ? employees : employees.filter((e) => profile && e.id === profile.id)).map((emp) => {
                      const dayAssignments = weekDates.map((date) =>
                        getAssignmentsForDate(date).filter((a) => a.employee_id === emp.id)
                      );
                      return (
                        <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{emp.full_name}</div>
                            <div className="text-[10px] text-gray-500 capitalize">{emp.department}</div>
                            {emp.work_preferences && (
                              <div className="text-[10px] text-gray-400 mt-1">
                                {emp.work_preferences.work_type === "intern" ? `Intern · ${emp.work_preferences.days_per_week}d/wk` : emp.work_preferences.work_type?.replace(/_/g, " ")}
                                {emp.work_preferences.preferred_shift_start && ` · ${emp.work_preferences.preferred_shift_start}-${emp.work_preferences.preferred_shift_end}`}
                              </div>
                            )}
                          </td>
                      {dayAssignments.map((dayAss, i) => (
                        <td key={weekDates[i]} className="p-2 text-center">
                          {dayAss.map((a) => {
                            const isLeave = a.is_leave;
                            const bgColor = isLeave ? 'bg-gray-400' : (a.shift.color || "#3B82F6");
                            return (
                              <div
                                key={a.id}
                                className="inline-block rounded-lg px-2 py-1 text-[10px] font-semibold text-white relative"
                                style={{ backgroundColor: bgColor }}
                                title={isLeave ? `${a.leave_type?.replace(/_/g, ' ') || 'Leave'} • ${a.location || 'office'}` : `${a.shift.name} • ${a.location || 'office'}`}
                              >
                                {isLeave ? `🏖️ ${a.leave_type?.charAt(0).toUpperCase()}${a.leave_type?.slice(1)}` : a.shift.name}
                                <div className="text-[8px] opacity-80">
                                  {isLeave ? (a.leave_type || 'Leave') : `${a.shift.start_time}-${a.shift.end_time}`}
                                </div>
                                {!isLeave && a.location && a.location !== 'office' && (
                                  <div className="text-[8px] opacity-70">{a.location === 'remote' ? '🏠' : '🔀'}</div>
                                )}
                                {a.is_recurring_instance && (
                                  <div className="text-[8px] opacity-70">↻</div>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "my-schedule" && (
        <Card>
          <CardHeader>
            <CardTitle>My Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
              </div>
            ) : myAssignments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No shifts assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {myAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-xs"
                        style={{ backgroundColor: a.shift.color || "#3B82F6" }}
                      >
                        {a.shift.name}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{a.shift.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(a.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {a.shift.start_time} - {a.shift.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSwapForm({ ...swapForm, assignment_id: a.id });
                          setShowSwapModal(true);
                        }}
                      >
                        Swap
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCoverageForm({ ...coverageForm, assignment_id: a.id });
                          setShowCoverageModal(true);
                        }}
                      >
                        <Shield className="h-4 w-4 mr-1" /> Coverage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === "swaps" && (
        <Card>
          <CardHeader>
            <CardTitle>Shift Swap Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSwaps ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
              </div>
            ) : swaps.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No swap requests found.</p>
            ) : (
              <div className="space-y-3">
                {swaps.map((swap) => (
                  <div key={swap.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">{swap.assignment.shift.name}</p>
                        <Badge className={swap.status === "pending" ? "bg-amber-100 text-amber-700" : swap.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {swap.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {swap.assignment.employee.full_name} • {swap.assignment.date}
                      </p>
                      {swap.target && (
                        <p className="text-xs text-gray-600">
                          Requested swap with: {swap.target.full_name}
                        </p>
                      )}
                      {swap.reason && (
                        <p className="text-xs text-gray-500 italic">Reason: {swap.reason}</p>
                      )}
                    </div>
                    {isManager && swap.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveSwap(swap.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleRejectSwap(swap.id)}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === "coverage" && (
        <Card>
          <CardHeader>
            <CardTitle>Shift Coverage Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCoverages ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
              </div>
            ) : coverages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No coverage requests found.</p>
            ) : (
              <div className="space-y-3">
                {coverages.map((coverage) => (
                  <div key={coverage.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">{coverage.assignment.shift.name}</p>
                        <Badge className={coverage.status === "pending" ? "bg-amber-100 text-amber-700" : coverage.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {coverage.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {coverage.assignment.employee.full_name} • {coverage.assignment.date}
                      </p>
                      <p className="text-xs text-gray-600">
                        Coverer: {coverage.coverer.full_name}
                      </p>
                      {coverage.reason && (
                        <p className="text-xs text-gray-500 italic">Reason: {coverage.reason}</p>
                      )}
                    </div>
                    {isManager && coverage.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveCoverage(coverage.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleRejectCoverage(coverage.id)}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === "requests" && isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No schedule requests found.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">
                          {req.is_leave ? `Leave (${req.leave_type?.replace(/_/g, ' ') || 'Leave'})` : req.shift?.name || 'Unknown Shift'}
                        </p>
                        <Badge className={req.status === "pending" ? "bg-amber-100 text-amber-700" : req.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {req.employee?.full_name} • {new Date(req.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                      {req.notes && (
                        <p className="text-xs text-gray-500 italic">Note: {req.notes}</p>
                      )}
                    </div>
                    {isManager && req.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveRequest(req.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleRejectRequest(req.id)}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Assign Shift or Leave</h2>
            </div>
            <form onSubmit={handleAddAssignment} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <select
                  value={assignForm.employee_id}
                  onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                      {emp.work_preferences?.work_type === "intern"
                        ? ` (Intern · ${emp.work_preferences.days_per_week}d/wk)`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPref && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                  <p className="font-medium mb-1">Employee schedule</p>
                  <p>Type: {selectedPref.work_type?.replace(/_/g, " ")}</p>
                  <p>Days per week: {selectedPref.days_per_week}</p>
                  {selectedPref.preferred_shift_start && (
                    <p>Preferred timing: {selectedPref.preferred_shift_start} - {selectedPref.preferred_shift_end}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isLeave"
                  checked={assignForm.is_leave}
                  onChange={(e) => setAssignForm({ ...assignForm, is_leave: e.target.checked, shift_id: e.target.checked ? "" : assignForm.shift_id })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isLeave" className="cursor-pointer flex items-center gap-1">
                  <FileText className="h-4 w-4" /> Mark as Leave
                </Label>
              </div>
              {assignForm.is_leave ? (
                <div className="space-y-1.5">
                  <Label>Leave Type *</Label>
                  <select
                    value={assignForm.leave_type}
                    onChange={(e) => setAssignForm({ ...assignForm, leave_type: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select leave type...</option>
                    <option value="casual">Casual</option>
                    <option value="sick">Sick</option>
                    <option value="earned">Earned</option>
                    <option value="maternity">Maternity</option>
                    <option value="paternity">Paternity</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Shift *</Label>
                    <select
                      value={assignForm.shift_id}
                      onChange={(e) => setAssignForm({ ...assignForm, shift_id: e.target.value })}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select shift...</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({shift.start_time}-{shift.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <div className="flex gap-2">
                      {['office', 'remote', 'hybrid'].map((loc) => (
                        <Button
                          key={loc}
                          type="button"
                          size="sm"
                          variant={assignForm.location === loc ? "default" : "outline"}
                          onClick={() => setAssignForm({ ...assignForm, location: loc })}
                          className="flex-1 capitalize"
                        >
                          <MapPin className="h-3 w-3 mr-1" /> {loc}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={assignForm.date}
                  onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                  required
                />
              </div>
              {!assignForm.is_leave && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={!!assignForm.recurrence_pattern}
                      onChange={(e) => {
                        const start = assignForm.date;
                        const endDate = new Date(start + 'T00:00:00');
                        endDate.setDate(endDate.getDate() + 28);
                        const year = endDate.getFullYear();
                        const month = String(endDate.getMonth() + 1).padStart(2, '0');
                        const day = String(endDate.getDate()).padStart(2, '0');
                        const endStr = `${year}-${month}-${day}`;
                        setAssignForm({
                          ...assignForm,
                          recurrence_pattern: e.target.checked ? { frequency: 'weekly', days: [] } : null,
                          start_date: e.target.checked ? start : "",
                          end_date: e.target.checked ? endStr : "",
                        });
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="recurring" className="cursor-pointer flex items-center gap-1">
                            🔄 Recurring Schedule
                    </Label>
                  </div>
                  {assignForm.recurrence_pattern && (
                    <div className="space-y-2 pl-6">
                      <div className="space-y-1.5">
                        <Label>Frequency</Label>
                        <select
                          value={assignForm.recurrence_pattern.frequency}
                          onChange={(e) => setAssignForm({
                            ...assignForm,
                            recurrence_pattern: { ...assignForm.recurrence_pattern!, frequency: e.target.value as 'weekly' | 'biweekly' }
                          })}
                          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Days</Label>
                        <div className="flex gap-1.5">
                          {DAYS.map((day, idx) => {
                            const dayNum = idx + 1;
                            const active = assignForm.recurrence_pattern?.days.includes(dayNum);
                            return (
                              <Button
                                key={day}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                onClick={() => {
                                  const days = assignForm.recurrence_pattern?.days.includes(dayNum)
                                    ? assignForm.recurrence_pattern.days.filter((d) => d !== dayNum)
                                    : [...(assignForm.recurrence_pattern?.days || []), dayNum].sort((a, b) => a - b);
                                  setAssignForm({ ...assignForm, recurrence_pattern: { ...assignForm.recurrence_pattern!, days } });
                                }}
                              >
                                {day}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={assignForm.start_date}
                            onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>End Date (optional)</Label>
                          <Input
                            type="date"
                            value={assignForm.end_date}
                            onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {conflicts.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <p className="font-medium mb-1">Conflicts detected:</p>
                  {conflicts.map((c, i) => <p key={i}>• {c}</p>)}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving..." : assignForm.is_leave ? "Mark Leave" : assignForm.recurrence_pattern ? "Create Recurring Schedule" : "Assign Shift"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowAssignModal(false); setConflicts([]); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Request Schedule</h2>
              <p className="text-xs text-gray-500 mt-1">Your request will be sent to your manager for approval</p>
            </div>
            <form onSubmit={handleRequestSchedule} className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reqIsLeave"
                  checked={requestForm.is_leave}
                  onChange={(e) => setRequestForm({ ...requestForm, is_leave: e.target.checked, shift_id: e.target.checked ? "" : requestForm.shift_id })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="reqIsLeave" className="cursor-pointer flex items-center gap-1">
                  <FileText className="h-4 w-4" /> Mark as Leave
                </Label>
              </div>
              {requestForm.is_leave ? (
                <div className="space-y-1.5">
                  <Label>Leave Type *</Label>
                  <select
                    value={requestForm.leave_type}
                    onChange={(e) => setRequestForm({ ...requestForm, leave_type: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select leave type...</option>
                    <option value="casual">Casual</option>
                    <option value="sick">Sick</option>
                    <option value="earned">Earned</option>
                    <option value="maternity">Maternity</option>
                    <option value="paternity">Paternity</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Shift *</Label>
                  <select
                    value={requestForm.shift_id}
                    onChange={(e) => setRequestForm({ ...requestForm, shift_id: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select shift...</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({shift.start_time}-{shift.end_time})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
                  required
                />
              </div>
              {!requestForm.is_leave && (
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <div className="flex gap-2">
                    {['office', 'remote', 'hybrid'].map((loc) => (
                      <Button
                        key={loc}
                        type="button"
                        size="sm"
                        variant={requestForm.location === loc ? "default" : "outline"}
                        onClick={() => setRequestForm({ ...requestForm, location: loc })}
                        className="flex-1 capitalize"
                      >
                        <MapPin className="h-3 w-3 mr-1" /> {loc}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Any additional information for your manager..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Request Shift Swap</h2>
            </div>
            <form onSubmit={handleSwapRequest} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Target Employee</Label>
                <select
                  value={swapForm.target_employee_id}
                  onChange={(e) => setSwapForm({ ...swapForm, target_employee_id: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select employee...</option>
                  {employees
                    .filter((e) => e.id !== profile?.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                  placeholder="Why do you need to swap this shift?"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Swap Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSwapModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCoverageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Request Shift Coverage</h2>
            </div>
            <form onSubmit={handleCoverageRequest} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Covered By *</Label>
                <select
                  value={coverageForm.covered_by}
                  onChange={(e) => setCoverageForm({ ...coverageForm, covered_by: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select employee...</option>
                  {employees
                    .filter((e) => e.id !== profile?.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea
                  value={coverageForm.reason}
                  onChange={(e) => setCoverageForm({ ...coverageForm, reason: e.target.value })}
                  placeholder="Why do you need coverage?"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Submitting..." : "Request Coverage"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCoverageModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
