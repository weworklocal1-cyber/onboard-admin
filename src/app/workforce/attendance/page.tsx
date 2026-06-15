"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface AttendanceRecord {
  id?: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  working_hours: number | null;
  status: string;
  is_late: boolean;
  notes: string | null;
}

export default function AttendancePage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [fetchingRecord, setFetchingRecord] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  }, [profile, supabase, todayStr]);

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

  const handleCheckIn = async () => {
    if (!profile) return;
    setSubmitting(true);
    try {
      const coords = await getLocation();
      
      const now = new Date();
      // Late threshold: 10:30 AM
      const lateThreshold = new Date();
      lateThreshold.setHours(10, 30, 0, 0);
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
    return format(parseISO(isoString), "hh:mm a");
  };

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
    present: { label: "Present", variant: "success" },
    absent: { label: "Absent", variant: "destructive" },
    half_day: { label: "Half Day", variant: "warning" },
    late: { label: "Late Arrival", variant: "warning" },
    wfh: { label: "WFH", variant: "outline" },
    on_leave: { label: "On Leave", variant: "secondary" },
  };

  const currentStatus = record ? statusMap[record.status] || { label: record.status, variant: "default" } : { label: "Not Checked In", variant: "secondary" };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance Clock</h1>
        <p className="text-gray-600">{todayFormatted}</p>
      </div>

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
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shift Rule</p>
              <p className="text-base font-semibold text-gray-700">General (10:00 AM - 7:00 PM)</p>
              <p className="text-xxs text-yellow-600 font-medium">Grace time until 10:30 AM</p>
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
    </div>
  );
}