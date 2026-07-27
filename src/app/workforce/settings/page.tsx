"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Setting = {
  id: string;
  key: string;
  value: string | null;
  type: string;
  is_secret: boolean;
  updated_at: string;
};

const KEYS = [
  { key: "github_pat", label: "GitHub Personal Access Token", secret: true, placeholder: "ghp_..." },
  { key: "resend_api_key", label: "Resend API Key", secret: true, placeholder: "re_..." },
  { key: "resend_from_email", label: "Resend From Email", secret: false, placeholder: "notifications@localwala.tech" },
  { key: "teams_webhook_url", label: "Teams Webhook URL", secret: false, placeholder: "https://outlook.office.com/webhook/..." },
];

export default function SettingsPage() {
  const supabase = createClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/workforce/settings", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to load settings");

        const data = await res.json();
        if (active) {
          const map: Record<string, string> = {};
          (data.settings || []).forEach((s: Setting) => {
            map[s.key] = s.value || "";
          });
          setValues(map);
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
  }, [supabase]);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      setValues((prev) => ({ ...prev, [key]: value }));
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage integrations and platform configuration.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {KEYS.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <Label htmlFor={item.key}>{item.label}</Label>
                  <Input
                    id={item.key}
                    type={item.secret ? "password" : "text"}
                    placeholder={item.placeholder}
                    value={values[item.key] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
                  />
                  {item.secret && (
                    <p className="text-[10px] text-gray-500">Stored securely and masked in UI.</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveSetting(item.key, values[item.key] || "")}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
