"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function AdminGstSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    academy_gst_rate: "18",
    academy_gst_enabled: "true",
    academy_gst_inclusive: "false",
    academy_gst_tin_number: "",
    academy_gst_company_name: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) {
        router.replace("/admin");
        return;
      }

      const res = await fetch("/api/admin/academy/settings/gst", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        router.replace("/admin");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch settings");

      const json = await res.json();
      if (json.settings) {
        setForm((prev) => ({
          ...prev,
          ...json.settings,
        }));
      }
    } catch (e) {
      console.error("fetchSettings failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) return;

      const res = await fetch("/api/admin/academy/settings/gst", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: form }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("GST settings saved successfully");
    } catch (e) {
      toast.error("Failed to save GST settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading GST settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">GST Settings</h1>
        <p className="text-gray-500">Configure tax and GST rules for course pricing</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Tax Configuration</h3>
                  <p className="text-sm text-gray-500">Set GST rate and tax behavior</p>
                </div>
                <Badge variant={form.academy_gst_enabled === "true" ? "default" : "secondary"}>
                  {form.academy_gst_enabled === "true" ? "GST Enabled" : "GST Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <Label htmlFor="gst_enabled" className="text-base font-medium">Enable GST</Label>
                  <p className="text-sm text-gray-500">Apply GST to course prices</p>
                </div>
                <select
                  id="gst_enabled"
                  value={form.academy_gst_enabled}
                  onChange={(e) => setForm({ ...form, academy_gst_enabled: e.target.value })}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_rate">GST Rate (%)</Label>
                <Input
                  id="gst_rate"
                  type="number"
                  min="0"
                  max="100"
                  value={form.academy_gst_rate}
                  onChange={(e) => setForm({ ...form, academy_gst_rate: e.target.value })}
                  placeholder="18"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <Label htmlFor="gst_inclusive" className="text-base font-medium">Prices Inclusive of GST</Label>
                  <p className="text-sm text-gray-500">Course prices already include GST</p>
                </div>
                <select
                  id="gst_inclusive"
                  value={form.academy_gst_inclusive}
                  onChange={(e) => setForm({ ...form, academy_gst_inclusive: e.target.value })}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
                <p className="text-sm text-gray-500">Used for invoices and receipts</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={form.academy_gst_company_name}
                  onChange={(e) => setForm({ ...form, academy_gst_company_name: e.target.value })}
                  placeholder="LocalWala Food Academy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tin_number">GSTIN / TIN Number</Label>
                <Input
                  id="tin_number"
                  value={form.academy_gst_tin_number}
                  onChange={(e) => setForm({ ...form, academy_gst_tin_number: e.target.value })}
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
