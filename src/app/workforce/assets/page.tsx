"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";
import { Plus, Trash2, User } from "lucide-react";

type AssetStatus = "active" | "assigned" | "available" | "retired";

const ASSET_TYPES = ['laptop', 'phone', 'tablet', 'camera', 'vehicle', 'furniture', 'equipment', 'other'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

const TYPE_LABELS: Record<string, string> = {
  laptop: "Laptop",
  phone: "Phone",
  tablet: "Tablet",
  camera: "Camera",
  vehicle: "Vehicle",
  furniture: "Furniture",
  equipment: "Equipment",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  assigned: "bg-blue-100 text-blue-700",
  available: "bg-gray-100 text-gray-700",
  retired: "bg-red-100 text-red-700",
};

export default function AssetsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { isAdmin } = usePermissions();
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingData, setLoadingingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    asset_type: "other",
    description: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    condition_status: "good",
    assigned_to: "",
    location: "",
    status: "available",
  });

  const isAdminUser = isAdmin(profile?.role || "");

  useEffect(() => {
    if (!profile) return;
    fetchAssets();
    if (isAdminUser) {
      fetchEmployees();
    }
  }, [profile, filterType, filterStatus]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchAssets = async () => {
    setLoadingingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/assets", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch assets");
      }

      const data = await res.json();
      let result = data.assets || [];

      if (filterType !== "all") {
        result = result.filter((a: any) => a.asset_type === filterType);
      }
      if (filterStatus !== "all") {
        result = result.filter((a: any) => a.status === filterStatus);
      }

      setAssets(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoadingingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Asset name is required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
          current_value: form.current_value ? Number(form.current_value) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create asset");
      }

      toast.success("Asset created successfully");
      setShowModal(false);
      setForm({
        name: "",
        asset_type: "other",
        description: "",
        serial_number: "",
        purchase_date: "",
        purchase_price: "",
        current_value: "",
        condition_status: "good",
        assigned_to: "",
        location: "",
        status: "available",
      });
      fetchAssets();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/assets/${assetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete asset");
      }

      toast.success("Asset deleted");
      setAssets(assets.filter((a) => a.id !== assetId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete asset");
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-sm text-gray-500">Track company assets and assignments</p>
        </div>
        {isAdminUser && (
          <Button onClick={() => setShowModal(true)}>📦 Add Asset</Button>
        )}
      </div>

      {isAdminUser && (
        <div className="flex items-center gap-3">
          <Label className="text-sm">Type:</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ASSET_TYPES.map(type => (
                <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-sm">Status:</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No assets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{asset.name}</span>
                  <Badge className={STATUS_STYLES[asset.status] || STATUS_STYLES.active}>
                    {asset.status}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-gray-500">{TYPE_LABELS[asset.asset_type] || asset.asset_type}</p>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {asset.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{asset.description}</p>
                )}
                {asset.serial_number && (
                  <p className="text-xs text-gray-500">S/N: {asset.serial_number}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Condition:</span>
                  <span className="capitalize">{asset.condition_status}</span>
                </div>
                {asset.assignee && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <User className="h-3 w-3" />
                    <span>{asset.assignee.full_name}</span>
                  </div>
                )}
                {asset.location && (
                  <p className="text-xs text-gray-500">Location: {asset.location}</p>
                )}
                {isAdminUser && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 w-full mt-2"
                    onClick={() => handleDelete(asset.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && isAdminUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add Asset</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Condition</Label>
                  <Select value={form.condition_status} onValueChange={v => setForm({ ...form, condition_status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input
                  value={form.serial_number}
                  onChange={e => setForm({ ...form, serial_number: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => setForm({ ...form, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.purchase_price}
                    onChange={e => setForm({ ...form, purchase_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v === "_none_" ? "" : v, status: v && v !== "_none_" ? "assigned" : "available" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Unassigned</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Creating..." : "Add Asset"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
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
