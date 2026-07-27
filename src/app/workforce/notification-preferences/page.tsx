"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

interface Preference {
  id: string;
  type: string;
  enabled: boolean;
}

const NOTIFICATION_TYPES = [
  { key: "attendance_reminder", label: "Attendance reminders", description: "Reminders to check in and check out." },
  { key: "checkout_reminder", label: "Checkout reminders", description: "Reminders to complete checkout at end of day." },
  { key: "update_reminder", label: "Update reminders", description: "Reminders to submit daily updates." },
  { key: "follow_up_reminder", label: "Follow-up reminders", description: "Reminders for pending follow-ups." },
  { key: "task_assigned", label: "Task assignments", description: "Notifications when a new task is assigned to you." },
  { key: "task_updated", label: "Task updates", description: "Notifications when your tasks are updated." },
  { key: "task_overdue", label: "Overdue task alerts", description: "Alerts when a task is past its due date." },
  { key: "blocker_flagged", label: "Blocker alerts", description: "Alerts when a task is marked as blocked." },
  { key: "restaurant_status_changed", label: "Restaurant status changes", description: "Updates when restaurant status changes." },
  { key: "campaign_assigned", label: "Campaign assignments", description: "Notifications when you are assigned a campaign." },
  { key: "general", label: "General announcements", description: "Platform-wide announcements and updates." },
];

export default function NotificationPreferencesPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !profile) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/workforce/notification-preferences", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to load preferences");

        const data = await res.json();
        if (active) {
          const map: Record<string, boolean> = {};
          (data.preferences || []).forEach((pref: Preference) => {
            map[pref.type] = pref.enabled;
          });
          setPreferences(map);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [profile, authLoading, supabase]);

  const togglePreference = async (type: string, enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, [type]: enabled }));

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/notification-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          preferences: [{ type, enabled }],
        }),
      });

      if (!res.ok) {
        setPreferences((prev) => ({ ...prev, [type]: !enabled }));
        throw new Error("Failed to save preference");
      }
    } catch {
      // handled above
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-sm text-gray-500">
          Choose what notifications you want to receive in-app.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>In-App Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {NOTIFICATION_TYPES.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <Switch
                    checked={!!preferences[item.key]}
                    onCheckedChange={(checked) => togglePreference(item.key, checked)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
