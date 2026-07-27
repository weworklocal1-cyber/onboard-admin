"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

const WORK_TYPES = [
  { value: "full_time", label: "Full Time (5 days)" },
  { value: "part_time", label: "Part Time" },
  { value: "intern", label: "Intern" },
  { value: "contract", label: "Contract" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkPreferencesPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<{ id: string; full_name: string; department: string | null }[]>([]);
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [form, setForm] = useState({
    work_type: "full_time",
    days_per_week: 5,
    preferred_shift_start: "",
    preferred_shift_end: "",
    working_days: [1, 2, 3, 4, 5],
    notes: "",
  });

  const isAdmin = profile?.role && ["founder", "super_admin", "hr_admin", "team_lead"].includes(profile.role);

  useEffect(() => {
    if (authLoading || !profile) return;
    fetchEmployees();
    fetchPreferences();
    loadMyPreferences();
  }, [profile, authLoading]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, department")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/work-preferences", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const map: Record<string, any> = {};
      (data.preferences || []).forEach((p: any) => {
        map[p.employee_id] = p;
      });
      setPreferences(map);
    } catch (err: any) {
      toast.error(err.message || "Failed to load work preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent, targetEmployeeId?: string) => {
    e.preventDefault();
    const finalTargetId = targetEmployeeId || selectedEmployeeId || profile?.id;
    if (!finalTargetId) {
      toast.error("Select an employee");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/work-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          employee_id: finalTargetId,
          ...form,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      toast.success("Work preference saved");
      fetchPreferences();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMyPreferences = (e: React.FormEvent) => {
    return handleSave(e, profile?.id);
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const existing = preferences[empId];
    if (existing) {
      setForm({
        work_type: existing.work_type || "full_time",
        days_per_week: existing.days_per_week || 5,
        preferred_shift_start: existing.preferred_shift_start || "",
        preferred_shift_end: existing.preferred_shift_end || "",
        working_days: existing.working_days || [1, 2, 3, 4, 5],
        notes: existing.notes || "",
      });
    } else {
      setForm({
        work_type: "full_time",
        days_per_week: 5,
        preferred_shift_start: "",
        preferred_shift_end: "",
        working_days: [1, 2, 3, 4, 5],
        notes: "",
      });
    }
  };

  const loadMyPreferences = () => {
    if (!profile) return;
    const existing = preferences[profile.id];
    if (existing) {
      setForm({
        work_type: existing.work_type || "full_time",
        days_per_week: existing.days_per_week || 5,
        preferred_shift_start: existing.preferred_shift_start || "",
        preferred_shift_end: existing.preferred_shift_end || "",
        working_days: existing.working_days || [1, 2, 3, 4, 5],
        notes: existing.notes || "",
      });
    } else {
      setForm({
        work_type: "full_time",
        days_per_week: 5,
        preferred_shift_start: "",
        preferred_shift_end: "",
        working_days: [1, 2, 3, 4, 5],
        notes: "",
      });
    }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day].sort((a, b) => a - b),
      days_per_week: prev.working_days.includes(day)
        ? Math.max(1, prev.days_per_week - 1)
        : Math.min(7, prev.days_per_week + 1),
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Work Preferences</h1>
        <p className="text-sm text-gray-500">
          Set your work schedule and availability. Managers can also configure schedules for their team.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>My Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-500">
              Configure your own work type, preferred timings, and working days.
            </p>
            <form onSubmit={handleSave} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Work Type</Label>
                <Select value={form.work_type} onValueChange={(v) => setForm({ ...form, work_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((wt) => (
                      <SelectItem key={wt.value} value={wt.value}>
                        {wt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Days Per Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={form.days_per_week}
                  onChange={(e) => setForm({ ...form, days_per_week: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Preferred Start Time</Label>
                <Input
                  type="time"
                  value={form.preferred_shift_start}
                  onChange={(e) => setForm({ ...form, preferred_shift_start: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Preferred End Time</Label>
                <Input
                  type="time"
                  value={form.preferred_shift_end}
                  onChange={(e) => setForm({ ...form, preferred_shift_end: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Working Days</Label>
                <div className="flex gap-2">
                  {DAYS.map((day, idx) => {
                    const dayNum = idx + 1;
                    const active = form.working_days.includes(dayNum);
                    return (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => toggleDay(dayNum)}
                      >
                        {day}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Save My Preference"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Manage Team Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={selectedEmployeeId} onValueChange={handleSelectEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.department ? `· ${emp.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEmployeeId && (
            <form onSubmit={handleSaveMyPreferences} className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label>Work Type</Label>
                    <Select value={form.work_type} onValueChange={(v) => setForm({ ...form, work_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_TYPES.map((wt) => (
                          <SelectItem key={wt.value} value={wt.value}>
                            {wt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Days Per Week</Label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={form.days_per_week}
                      onChange={(e) => setForm({ ...form, days_per_week: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Preferred Start Time</Label>
                    <Input
                      type="time"
                      value={form.preferred_shift_start}
                      onChange={(e) => setForm({ ...form, preferred_shift_start: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Preferred End Time</Label>
                    <Input
                      type="time"
                      value={form.preferred_shift_end}
                      onChange={(e) => setForm({ ...form, preferred_shift_end: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Working Days</Label>
                    <div className="flex gap-2">
                      {DAYS.map((day, idx) => {
                        const dayNum = idx + 1;
                        const active = form.working_days.includes(dayNum);
                        return (
                          <Button
                            key={day}
                            type="button"
                            size="sm"
                            variant={active ? "default" : "outline"}
                            onClick={() => toggleDay(dayNum)}
                          >
                            {day}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Saving..." : "Save Preference"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
