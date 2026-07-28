"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Calendar, AlertCircle, MapPin, Plus, Edit, Trash2 } from "lucide-react";

interface AttendanceRecord {
  id?: string;
  date?: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  working_hours: number | null;
  break_deduction_hours: number | null;
  net_working_hours: number | null;
  early_departure: boolean | null;
  early_departure_minutes: number | null;
  status: string;
  is_late: boolean;
  notes: string | null;
}

interface ShiftInfo {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface WorkPreference {
  preferred_shift_start: string | null;
  preferred_shift_end: string | null;
}

export default function AttendancePage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [fetchingRecord, setFetchingRecord] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"today" | "history">("today");
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genDate, setGenDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [adminRecords, setAdminRecords] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<"team" | "all">("team");
  const [adminStartDate, setAdminStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [adminEndDate, setAdminEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState("");
  const [employees, setEmployees] = useState<{ id: string; full_name: string; department: string | null }[]>([]);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [workPreference, setWorkPreference] = useState<WorkPreference | null>(null);
  const [loadingShiftInfo, setLoadingShiftInfo] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTargetId, setOverrideTargetId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [geofences, setGeofences] = useState<Array<{ id: string; name: string; address: string; latitude: number; longitude: number; radius_meters: number; is_active: boolean }>>([]);
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({ name: "Office", address: "", latitude: "", longitude: "", radius_meters: 200, is_active: true });
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);

  const isAdmin = profile?.role && ["founder", "super_admin", "hr_admin", "team_lead"].includes(profile.role);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!profile) return;

    const fetchTodayRecord = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", profile.id)
          .eq("date", todayStr)
          .maybeSingle();

        if (error) throw error;
        setRecord(data || null);
      } catch (err: any) {
        console.error("Error fetching attendance:", err.message);
        toast.error("Failed to load today's attendance status");
      } finally {
        setFetchingRecord(false);
      }
    };

    fetchTodayRecord();
    if (isAdmin) {
      fetchEmployees();
    }
  }, [profile, supabase, todayStr, isAdmin]);

  useEffect(() => {
    if (!profile) return;
    setLoadingShiftInfo(true);

    async function loadShiftInfo() {
      try {
        const { data: assignment } = await supabase
          .from("roster_assignments")
          .select("shift:shifts(*)")
          .eq("employee_id", profile!.id)
          .eq("date", todayStr)
          .maybeSingle();

        if (assignment && (assignment as any).shift) {
          setShiftInfo((assignment as any).shift as ShiftInfo);
        } else {
          setShiftInfo(null);
        }

        const { data: pref } = await supabase
          .from("employee_work_preferences")
          .select("preferred_shift_start, preferred_shift_end")
          .eq("employee_id", profile!.id)
          .maybeSingle();

        setWorkPreference(pref as WorkPreference | null);
      } catch (err: any) {
        console.error("Error loading shift info:", err.message);
      } finally {
        setLoadingShiftInfo(false);
      }
    }

    loadShiftInfo();
  }, [profile, supabase, todayStr]);

  useEffect(() => {
    if (tab !== "history" || !profile) return;

    let active = true;
    setLoadingHistory(true);

    async function loadHistory() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/workforce/attendance/me?limit=50", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to load history");

        const data = await res.json();
        if (active) {
          setHistory(data.records || []);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load attendance history");
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [tab, profile, supabase]);

  const getLocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS Geolocation is not supported by your browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          let msg = "Could not retrieve GPS coordinates.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "GPS/Location access was denied. Geolocation is required to check in/out.";
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const validateGeofence = async (lat: number, lng: number): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/attendance/geofence?lat=${lat}&lng=${lng}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return true;
      const result = await res.json();
      if (!result.allowed) {
        toast.error(result.reason || "You are outside the office geofence");
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const handleCheckIn = async () => {
    if (!profile) return;
    setSubmitting(true);
    try {
      const coords = await getLocation();

      const geofenceOk = await validateGeofence(coords.latitude, coords.longitude);
      if (!geofenceOk) {
        setSubmitting(false);
        return;
      }

      const now = new Date();

      let lateThreshold: Date;
      let shiftDisplay = "General (10:00 AM - 7:00 PM)";
      let graceMessage = "Grace time until 10:30 AM";

      if (shiftInfo) {
        const [startH, startM] = shiftInfo.start_time.split(":").map(Number);
        lateThreshold = new Date();
        lateThreshold.setHours(startH, startM + 15, 0, 0);
        shiftDisplay = `${shiftInfo.name} (${formatTime(shiftInfo.start_time)} - ${formatTime(shiftInfo.end_time)})`;
        graceMessage = `Grace time until ${format(new Date(lateThreshold), "hh:mm a")}`;
      } else if (workPreference?.preferred_shift_start) {
        const [startH, startM] = workPreference.preferred_shift_start.split(":").map(Number);
        lateThreshold = new Date();
        lateThreshold.setHours(startH, startM + 15, 0, 0);
        shiftDisplay = `Preferred (${workPreference.preferred_shift_start} - ${workPreference.preferred_shift_end || "end"})`;
        graceMessage = `Grace time until ${format(new Date(lateThreshold), "hh:mm a")}`;
      } else {
        lateThreshold = new Date();
        lateThreshold.setHours(10, 30, 0, 0);
      }

      const isLate = now > lateThreshold;

      const payload = {
        employee_id: profile.id,
        date: todayStr,
        check_in_time: now.toISOString(),
        check_in_lat: coords.latitude,
        check_in_lng: coords.longitude,
        status: isLate ? "late" : "present",
        is_late: isLate,
      };

      const { data, error } = await supabase
        .from("attendance")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      setRecord(data);
      toast.success(isLate ? "Checked in! (Flagged as Late arrival)" : "Checked in successfully!");
    } catch (err: any) {
      console.error("Check-in error:", err);
      toast.error(err.message || "Failed to check in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!profile || !record) return;
    setSubmitting(true);
    try {
      const coords = await getLocation();

      const geofenceOk = await validateGeofence(coords.latitude, coords.longitude);
      if (!geofenceOk) {
        setSubmitting(false);
        return;
      }

      const now = new Date();

      const payload = {
        check_out_time: now.toISOString(),
        check_out_lat: coords.latitude,
        check_out_lng: coords.longitude,
        status: record.status === "late" ? "late" : "present", // keep late status if already flagged
      };

      const { data, error } = await supabase
        .from("attendance")
        .update(payload)
        .eq("employee_id", profile.id)
        .eq("date", todayStr)
        .select()
        .single();

      if (error) throw error;
      setRecord(data);
      toast.success("Checked out successfully! Working hours updated.");
    } catch (err: any) {
      console.error("Check-out error:", err);
      toast.error(err.message || "Failed to check out");
    } finally {
      setSubmitting(false);
    }
  };

   const handleAutoGenerate = async () => {
     if (!isAdmin) return;
     setGenerating(true);
     try {
       const { data: { session } } = await supabase.auth.getSession();
       const res = await fetch("/api/workforce/attendance/auto-generate", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${session?.access_token}`,
         },
         body: JSON.stringify({ start_date: genDate, end_date: genDate }),
       });

       if (!res.ok) {
         const err = await res.json().catch(() => ({}));
         throw new Error(err.error || "Failed to generate attendance");
       }

       const data = await res.json();
        toast.success(data.message || `Generated ${data.created} attendance records`);
      } catch (err: any) {
        toast.error(err.message || "Failed to generate attendance");
      } finally {
        setGenerating(false);
      }
    };

    const handleAutoAbsent = async () => {
      if (!isAdmin) return;
      setGenerating(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/workforce/attendance/auto-absent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ date: genDate }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to mark absences");
        }

        const data = await res.json();
        toast.success(data.message || `Marked ${data.marked} employees as absent`);
      } catch (err: any) {
        toast.error(err.message || "Failed to mark absences");
      } finally {
        setGenerating(false);
      }
    };

    const openOverrideModal = (recordId: string, currentStatus: string) => {
      setOverrideTargetId(recordId);
      setOverrideStatus(currentStatus);
      setOverrideReason("");
      setShowOverrideModal(true);
    };

    const handleOverrideAttendance = async () => {
      if (!overrideTargetId || !overrideStatus) return;
      setSavingOverride(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/workforce/attendance/${overrideTargetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ status: overrideStatus, reason: overrideReason }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to override attendance");
        }

        toast.success("Attendance overridden successfully");
        setShowOverrideModal(false);
        setOverrideTargetId(null);
        setOverrideReason("");
        fetchAdminAttendance();
      } catch (err: any) {
        toast.error(err.message || "Failed to override attendance");
      } finally {
        setSavingOverride(false);
      }
    };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, department")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchGeofences = async () => {
    setLoadingGeofences(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/attendance/geofence", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGeofences(data.geofences || []);
      }
    } catch {
      toast.error("Failed to load geofences");
    } finally {
      setLoadingGeofences(false);
    }
  };

  const handleSaveGeofence = async () => {
    if (!geofenceForm.latitude || !geofenceForm.longitude) {
      toast.error("Latitude and longitude are required");
      return;
    }
    setSavingGeofence(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = editingGeofenceId ? "PUT" : "POST";
      const url = editingGeofenceId
        ? `/api/workforce/attendance/geofence?id=${editingGeofenceId}`
        : "/api/workforce/attendance/geofence";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(geofenceForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save geofence");
      toast.success(editingGeofenceId ? "Geofence updated" : "Geofence created");
      setShowGeofenceModal(false);
      setEditingGeofenceId(null);
      setGeofenceForm({ name: "Office", address: "", latitude: "", longitude: "", radius_meters: 200, is_active: true });
      fetchGeofences();
    } catch (err: any) {
      toast.error(err.message || "Failed to save geofence");
    } finally {
      setSavingGeofence(false);
    }
  };

  const handleDeleteGeofence = async (id: string) => {
    if (!confirm("Delete this geofence?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/attendance/geofence?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete geofence");
      }
      toast.success("Geofence deleted");
      fetchGeofences();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete geofence");
    }
  };

  const openCreateGeofence = () => {
    setEditingGeofenceId(null);
    setGeofenceForm({ name: "Office", address: "", latitude: "", longitude: "", radius_meters: 200, is_active: true });
    setShowGeofenceModal(true);
  };

  const openEditGeofence = (g: typeof geofences[0]) => {
    setEditingGeofenceId(g.id);
    setGeofenceForm({
      name: g.name,
      address: g.address || "",
      latitude: String(g.latitude),
      longitude: String(g.longitude),
      radius_meters: g.radius_meters,
      is_active: g.is_active,
    });
    setShowGeofenceModal(true);
  };

  const fetchAdminAttendance = async () => {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (adminStartDate) params.set("start_date", adminStartDate);
      if (adminEndDate) params.set("end_date", adminEndDate);
      if (adminEmployeeFilter) params.set("employee_id", adminEmployeeFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/workforce/attendance/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load admin attendance");
      }

      const data = await res.json();
      setAdminRecords(data.records || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load attendance");
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (isAdmin && tab === "history") {
      fetchAdminAttendance();
    }
  }, [isAdmin, tab, adminStartDate, adminEndDate, adminEmployeeFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchGeofences();
    }
  }, [isAdmin]);

  if (loading || fetchingRecord) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  // Format Helper functions
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return "—";
    try {
      return format(parseISO(isoString), "hh:mm a");
    } catch {
      return "—";
    }
  };

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }> = {
    present: { label: "Present", variant: "success" },
    absent: { label: "Absent", variant: "warning" },
    half_day: { label: "Half Day", variant: "warning" },
    late: { label: "Late Arrival", variant: "warning" },
    wfh: { label: "WFH", variant: "outline" },
    on_leave: { label: "On Leave", variant: "secondary" },
  };

  const currentStatus = record ? statusMap[record.status] || { label: record.status, variant: "default" } : { label: "Not Checked In", variant: "secondary" };

  const getGraceTimeString = (startTime: string): string => {
    const [h, m] = startTime.split(":").map(Number);
    const grace = new Date();
    grace.setHours(h, m + 15, 0, 0);
    return format(grace, "hh:mm a");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-gray-600">Track your daily check-ins and view history.</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "today" ? "default" : "outline"}
          onClick={() => setTab("today")}
        >
          Today
        </Button>
        <Button
          variant={tab === "history" ? "default" : "outline"}
          onClick={() => setTab("history")}
        >
          History
        </Button>
      </div>

      {isAdmin && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-brand-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Auto-generate attendance from roster</p>
                <p className="text-xs text-gray-500">Creates attendance records only for scheduled shifts</p>
              </div>
              <Input
                type="date"
                value={genDate}
                onChange={(e) => setGenDate(e.target.value)}
                className="w-40 text-sm"
              />
              <Button onClick={handleAutoGenerate} disabled={generating} size="sm">
                {generating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Mark absentees</p>
                <p className="text-xs text-gray-500">Mark scheduled employees as absent if they didn&apos;t check in</p>
              </div>
              <Input
                type="date"
                value={genDate}
                onChange={(e) => setGenDate(e.target.value)}
                className="w-40 text-sm"
              />
              <Button onClick={handleAutoAbsent} disabled={generating} variant="destructive" size="sm">
                {generating ? "Processing..." : "Mark Absent"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-brand-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Office Geofence</p>
                <p className="text-xs text-gray-500">Configure office location for check-in validation</p>
              </div>
              <Button size="sm" onClick={openCreateGeofence}>
                <Plus className="h-4 w-4 mr-1" /> Add Geofence
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && geofences.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-gray-800">Configured Geofences</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Address</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Latitude</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Longitude</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Radius</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {geofences.map((g) => (
                    <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{g.name}</td>
                      <td className="py-3 px-4 text-gray-700">{g.address || "—"}</td>
                      <td className="py-3 px-4 text-gray-700">{Number(g.latitude).toFixed(6)}</td>
                      <td className="py-3 px-4 text-gray-700">{Number(g.longitude).toFixed(6)}</td>
                      <td className="py-3 px-4 text-gray-700">{g.radius_meters}m</td>
                      <td className="py-3 px-4">
                        <Badge variant={g.is_active ? "success" : "secondary"} className="capitalize">
                          {g.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditGeofence(g)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteGeofence(g.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editingGeofenceId ? "Edit Geofence" : "New Geofence"}</h2>
              <p className="text-xs text-gray-500 mt-1">Set the office location and allowed radius</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  placeholder="e.g. Main Office"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={geofenceForm.address}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, address: e.target.value })}
                  placeholder="Office address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Latitude *</Label>
                  <Input
                    type="number"
                    step="any"
                    value={geofenceForm.latitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, latitude: e.target.value })}
                    placeholder="19.0760"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude *</Label>
                  <Input
                    type="number"
                    step="any"
                    value={geofenceForm.longitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, longitude: e.target.value })}
                    placeholder="72.8777"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Radius (meters)</Label>
                <Input
                  type="number"
                  value={geofenceForm.radius_meters}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, radius_meters: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gfActive"
                  checked={geofenceForm.is_active}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="gfActive" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveGeofence} className="flex-1" disabled={savingGeofence}>
                  {savingGeofence ? "Saving..." : editingGeofenceId ? "Update" : "Create"}
                </Button>
                <Button variant="outline" onClick={() => { setShowGeofenceModal(false); setEditingGeofenceId(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-gray-800">Today&apos;s Status</span>
            <Badge variant={currentStatus.variant as any} className="capitalize">
              {currentStatus.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Check In Time</p>
              <p className="text-xl font-bold text-gray-800">{formatTime(record?.check_in_time)}</p>
              {record?.check_in_lat && (
                <p className="text-xxs text-gray-400 mt-1">
                  📍 {record.check_in_lat.toFixed(5)}, {record.check_in_lng?.toFixed(5)}
                </p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Check Out Time</p>
              <p className="text-xl font-bold text-gray-800">{formatTime(record?.check_out_time)}</p>
              {record?.check_out_lat && (
                <p className="text-xxs text-gray-400 mt-1">
                  📍 {record.check_out_lat.toFixed(5)}, {record.check_out_lng?.toFixed(5)}
                </p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Working Hours</p>
              <p className="text-xl font-bold text-gray-800">
                {record?.working_hours !== null && record?.working_hours !== undefined 
                  ? `${record.working_hours} hrs` 
                  : "—"}
              </p>
              {record?.break_deduction_hours ? (
                <p className="text-xxs text-gray-500">-{record.break_deduction_hours}h break deducted</p>
              ) : null}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Net Hours</p>
              <p className="text-xl font-bold text-gray-800">
                {record?.net_working_hours !== null && record?.net_working_hours !== undefined 
                  ? `${record.net_working_hours} hrs` 
                  : "—"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shift Rule</p>
              {loadingShiftInfo ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                </div>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-700">
                    {shiftInfo
                      ? `${shiftInfo.name} (${formatTime(shiftInfo.start_time)} - ${formatTime(shiftInfo.end_time)})`
                      : workPreference?.preferred_shift_start
                        ? `Preferred (${workPreference.preferred_shift_start} - ${workPreference.preferred_shift_end || "end"})`
                        : "General (10:00 AM - 7:00 PM)"}
                  </p>
                  <p className="text-xxs text-yellow-600 font-medium">
                    {shiftInfo
                      ? `Grace time until ${getGraceTimeString(shiftInfo.start_time)}`
                      : workPreference?.preferred_shift_start
                        ? `Grace time until ${getGraceTimeString(workPreference.preferred_shift_start)}`
                        : "Grace time until 10:30 AM"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            {!record ? (
              <Button
                onClick={handleCheckIn}
                isLoading={submitting}
                className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                📥 Check In
              </Button>
            ) : !record.check_out_time ? (
              <Button
                onClick={handleCheckOut}
                isLoading={submitting}
                className="w-full h-12 text-base font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                📤 Check Out
              </Button>
            ) : (
              <div className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 font-medium">
                🎉 Shift completed for today. Great work!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {tab === "history" && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-gray-800">
              {isAdmin ? "Team Attendance History" : "Attendance History"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isAdmin && (
              <div className="space-y-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Employee</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={adminEmployeeFilter}
                      onChange={(e) => setAdminEmployeeFilter(e.target.value)}
                    >
                      <option value="">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} {emp.department ? `· ${emp.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={adminStartDate}
                      onChange={(e) => setAdminStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={adminEndDate}
                      onChange={(e) => setAdminEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="pt-5">
                    <Button onClick={fetchAdminAttendance} disabled={loadingAdmin} size="sm">
                      {loadingAdmin ? "Loading..." : "Apply Filter"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isAdmin ? (
              loadingAdmin ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : adminRecords.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No attendance records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Check In</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Check Out</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Hours</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Break</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Net Hours</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Early Departure</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        {isAdmin && <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {adminRecords.map((r: any) => {
                        const dateObj = r.date ? new Date(r.date + "T00:00:00") : null;
                        const dateLabel = dateObj ? format(dateObj, "MMM d, yyyy") : "Unknown date";
                        const statusInfo = statusMap[r.status] || { label: r.status, variant: "default" as const };
                        const empName = r.employee?.full_name || "Unknown";
                        const empDept = r.employee?.department || "";

                        return (
                          <tr key={r.id || `${r.employee_id}_${r.date}`} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900">{empName}</p>
                                <p className="text-xs text-gray-500">{empDept}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700">{dateLabel}</td>
                            <td className="py-3 px-4 text-gray-700">{formatTime(r.check_in_time)}</td>
                            <td className="py-3 px-4 text-gray-700">{formatTime(r.check_out_time)}</td>
                            <td className="py-3 px-4 text-gray-700">{r.working_hours ?? 0} hrs</td>
                            <td className="py-3 px-4 text-gray-700">{r.break_deduction_hours ? `-${r.break_deduction_hours}h` : "—"}</td>
                            <td className="py-3 px-4 text-gray-700 font-medium">{r.net_working_hours ?? "—"} hrs</td>
                            <td className="py-3 px-4 text-gray-700">
                              {r.early_departure ? (
                                <span className="text-xs font-medium text-red-600">-{r.early_departure_minutes}m</span>
                              ) : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <Badge variant={statusInfo.variant as any} className="capitalize w-fit">
                                  {statusInfo.label}
                                </Badge>
                                {r.override_by && (
                                  <span className="text-[10px] text-gray-400">Overridden</span>
                                )}
                              </div>
                            </td>
                            {isAdmin && (
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => openOverrideModal(r.id, r.status)}
                                >
                                  Override
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : loadingHistory ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No attendance records found.</p>
            ) : (
              <div className="space-y-3">
                {history.map((r) => {
                  const dateObj = r.date ? new Date(r.date + "T00:00:00") : null;
                  const dateLabel = dateObj ? format(dateObj, "MMM d, yyyy") : "Unknown date";
                  const statusInfo = statusMap[r.status] || { label: r.status, variant: "default" as const };

                  return (
                    <div
                      key={r.id || r.date}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{dateLabel}</p>
                        <p className="text-xs text-gray-500">
                          In: {formatTime(r.check_in_time)} • Out: {formatTime(r.check_out_time)} • {r.working_hours ?? 0} hrs
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} className="capitalize">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Override Attendance</h2>
              <p className="text-xs text-gray-500 mt-1">Update status with a reason</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>New Status *</Label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select status...</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                  <option value="wfh">WFH</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason for override..."
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleOverrideAttendance}
                  className="flex-1"
                  disabled={savingOverride || !overrideStatus}
                >
                  {savingOverride ? "Saving..." : "Save Override"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setOverrideTargetId(null);
                    setOverrideReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}