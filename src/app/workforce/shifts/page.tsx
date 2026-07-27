"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Clock, X } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

const COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
  { value: "#14B8A6", label: "Teal" },
];

const supabase = createClient();

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  start_time: string;
  end_time: string;
  color: string;
};

const emptyForm: FormState = {
  name: "",
  start_time: "10:30",
  end_time: "19:00",
  color: "#3B82F6",
};

export default function ManageShiftsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isManager = profile
    ? ["founder", "super_admin", "hr_admin", "team_lead"].includes(profile.role)
    : false;

  const loadShifts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/shifts", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setShifts(json.shifts || []);
      } else {
        toast.error("Failed to load shifts");
      }
    } catch {
      toast.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile) {
      loadShifts();
    }
  }, [authLoading, profile]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      color: shift.color,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.start_time || !form.end_time) {
      toast.error("Name, start time, and end time are required");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = editingId
        ? `/api/workforce/shifts/${editingId}`
        : "/api/workforce/shifts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editingId ? "update" : "create"} shift`);
      }

      toast.success(
        editingId
          ? "Shift updated successfully"
          : "Shift created successfully"
      );
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      loadShifts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift? This may affect existing roster assignments.")) {
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/shifts/${shiftId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete shift");
      }

      toast.success("Shift deleted");
      loadShifts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete shift");
    } finally {
      setSaving(false);
    }
  };

  const colorLabel = (hex: string) => {
    return COLORS.find((c) => c.value.toLowerCase() === hex.toLowerCase())?.label || hex;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500">You do not have permission to manage shifts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Shifts</h1>
          <p className="text-sm text-gray-500">
            Create, edit, and delete shifts that can be assigned to employees
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Shift
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No shifts created yet.</p>
              <Button className="mt-4" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Create First Shift
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-500">Color</th>
                    <th className="text-left p-3 font-medium text-gray-500">Name</th>
                    <th className="text-left p-3 font-medium text-gray-500">Start</th>
                    <th className="text-left p-3 font-medium text-gray-500">End</th>
                    <th className="text-left p-3 font-medium text-gray-500">Duration</th>
                    <th className="text-right p-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => {
                    const startMins = timeToMinutes(shift.start_time);
                    const endMins = timeToMinutes(shift.end_time);
                    const durationMins = endMins >= startMins
                      ? endMins - startMins
                      : 24 * 60 - startMins + endMins;
                    const hours = Math.floor(durationMins / 60);
                    const mins = durationMins % 60;

                    return (
                      <tr key={shift.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-5 w-5 rounded-full border"
                              style={{ backgroundColor: shift.color }}
                            />
                            <span className="text-xs text-gray-500">
                              {colorLabel(shift.color)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-gray-900">{shift.name}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-700">{shift.start_time}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-700">{shift.end_time}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {hours}h {mins > 0 ? `${mins}m` : ""}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(shift)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(shift.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Shift" : "New Shift"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setShowModal(false); setEditingId(null); setForm(emptyForm); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Shift Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Morning Shift"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select
                  value={form.color}
                  onValueChange={(value) => setForm({ ...form, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: form.color }}
                        />
                        {colorLabel(form.color)}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Shift" : "Create Shift"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowModal(false); setEditingId(null); setForm(emptyForm); }}
                >
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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
