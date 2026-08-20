"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Eye, EyeOff } from "lucide-react";

export default function AdminPaymentSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [form, setForm] = useState({
    academy_payment_gateway: "razorpay",
    academy_razorpay_key_id: "",
    academy_razorpay_key_secret: "",
    academy_razorpay_webhook_secret: "",
    academy_payment_enabled: "true",
    academy_upi_id: "",
    academy_upi_name: "",
    academy_bank_account_holder: "",
    academy_bank_account_number: "",
    academy_bank_ifsc: "",
    academy_bank_name: "",
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

      const res = await fetch("/api/admin/academy/settings/payment", {
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

      const res = await fetch("/api/admin/academy/settings/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: form }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Payment settings saved successfully");
    } catch (e) {
      toast.error("Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading payment settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Settings</h1>
        <p className="text-gray-500">Configure payment gateway and Razorpay settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Gateway</h3>
                  <p className="text-sm text-gray-500">Select and configure your payment gateway</p>
                </div>
                <Badge variant={form.academy_payment_enabled === "true" ? "default" : "secondary"}>
                  {form.academy_payment_enabled === "true" ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gateway">Payment Gateway</Label>
                <select
                  id="gateway"
                  value={form.academy_payment_gateway}
                  onChange={(e) => setForm({ ...form, academy_payment_gateway: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <Label htmlFor="payment_enabled" className="text-base font-medium">Enable Payments</Label>
                  <p className="text-sm text-gray-500">Allow students to make course payments</p>
                </div>
                <select
                  id="payment_enabled"
                  value={form.academy_payment_enabled}
                  onChange={(e) => setForm({ ...form, academy_payment_enabled: e.target.value })}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Razorpay Configuration</h3>
                  <p className="text-sm text-gray-500">Enter your Razorpay API credentials</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSecrets(!showSecrets)}
                  title={showSecrets ? "Hide secrets" : "Show secrets"}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="razorpay_key_id">Razorpay Key ID</Label>
                <Input
                  id="razorpay_key_id"
                  value={form.academy_razorpay_key_id}
                  onChange={(e) => setForm({ ...form, academy_razorpay_key_id: e.target.value })}
                  placeholder="rzp_live_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="razorpay_key_secret">Razorpay Key Secret</Label>
                <Input
                  id="razorpay_key_secret"
                  type={showSecrets ? "text" : "password"}
                  value={form.academy_razorpay_key_secret}
                  onChange={(e) => setForm({ ...form, academy_razorpay_key_secret: e.target.value })}
                  placeholder="Enter Razorpay Key Secret"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="razorpay_webhook_secret">Webhook Secret</Label>
                <Input
                  id="razorpay_webhook_secret"
                  type={showSecrets ? "text" : "password"}
                  value={form.academy_razorpay_webhook_secret}
                  onChange={(e) => setForm({ ...form, academy_razorpay_webhook_secret: e.target.value })}
                  placeholder="Enter Razorpay Webhook Secret"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Direct UPI / Bank Details</h3>
                <p className="text-sm text-gray-500">These details are shown to students for manual UPI or bank transfers</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upi_id">UPI ID</Label>
                <Input
                  id="upi_id"
                  value={form.academy_upi_id}
                  onChange={(e) => setForm({ ...form, academy_upi_id: e.target.value })}
                  placeholder="localwala@upi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upi_name">UPI Account Name</Label>
                <Input
                  id="upi_name"
                  value={form.academy_upi_name}
                  onChange={(e) => setForm({ ...form, academy_upi_name: e.target.value })}
                  placeholder="LocalWala Academy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={form.academy_bank_name}
                  onChange={(e) => setForm({ ...form, academy_bank_name: e.target.value })}
                  placeholder="HDFC Bank"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_holder">Account Holder Name</Label>
                <Input
                  id="bank_account_holder"
                  value={form.academy_bank_account_holder}
                  onChange={(e) => setForm({ ...form, academy_bank_account_holder: e.target.value })}
                  placeholder="LocalWala Technologies Pvt Ltd"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={form.academy_bank_account_number}
                  onChange={(e) => setForm({ ...form, academy_bank_account_number: e.target.value })}
                  placeholder="50100012345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_ifsc">IFSC Code</Label>
                <Input
                  id="bank_ifsc"
                  value={form.academy_bank_ifsc}
                  onChange={(e) => setForm({ ...form, academy_bank_ifsc: e.target.value })}
                  placeholder="HDFC0001234"
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
