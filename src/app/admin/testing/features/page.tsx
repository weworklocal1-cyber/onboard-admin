"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { FeatureRequest, FEATURE_STATUS_COLORS, PRIORITY_COLORS } from "@/types/testing";

export default function FeaturesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [editingFeature, setEditingFeature] = useState<FeatureRequest | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editAdminNotes, setEditAdminNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeature, setNewFeature] = useState({
    title: "",
    description: "",
    priority: "medium",
  });
  const [addingFeature, setAddingFeature] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin");
        return;
      }

      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.push("/admin");
        return;
      }

      setAuthChecking(false);
    };
    checkAuth();
  }, [router, supabase]);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/testing/features?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch features");
      const json = await res.json();
      setFeatures(json.data || []);
    } catch {
      toast.error("Failed to load features");
    } finally {
setLoading(false);
    }
  };

  const handleUpdateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;

    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/testing/features/${editingFeature.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          status: editStatus,
          admin_notes: editAdminNotes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update feature");
      }

      toast.success("Feature updated successfully");
      setEditingFeature(null);
      fetchFeatures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update feature");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeature.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setAddingFeature(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/testing/features", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: newFeature.title.trim(),
          description: newFeature.description.trim(),
          priority: newFeature.priority,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add feature");
      }

      toast.success("Feature request added");
      setShowAddModal(false);
      setNewFeature({ title: "", description: "", priority: "medium" });
      fetchFeatures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add feature");
    } finally {
      setAddingFeature(false);
    }
  };

  const handleDeleteFeature = async (feature: FeatureRequest) => {
    if (!confirm(`Delete feature request "${feature.title}"?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/testing/features/${feature.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Feature deleted");
      fetchFeatures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleSearch = () => {
    fetchFeatures();
  };

  if (authChecking) {
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
          <h1 className="text-2xl font-bold">Feature Requests</h1>
          <p className="text-gray-500">Total: {features.length} requests</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add Feature</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>Search</Button>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="implemented">Implemented</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading features...</div>
        ) : features.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No feature requests found</div>
        ) : (
          features.map((feature) => (
            <Card key={feature.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={PRIORITY_COLORS[feature.priority]}>
                      {feature.priority}
                    </Badge>
                    <Badge className={FEATURE_STATUS_COLORS[feature.status]}>
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description || "No description"}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    {feature.user_name && <span>By: {feature.user_name}</span>}
                    {feature.user_email && <span className="ml-2">{feature.user_email}</span>}
                  </div>
                  <span>
                    {new Date(feature.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
<div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingFeature(feature);
                        setEditStatus(feature.status);
                        setEditAdminNotes(feature.admin_notes || "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteFeature(feature)}
                    >
                      Delete
                    </Button>
                  </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editingFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Edit Feature Request</h2>
            </div>
            <form onSubmit={handleUpdateFeature} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Title</p>
                <p className="text-gray-900">{editingFeature.title}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-gray-900">{editingFeature.description || "No description"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="implemented">Implemented</option>
                </select>
              </div>

              <div>
                <Textarea
                  label="Admin Notes"
                  placeholder="Add notes about this feature request..."
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFeature(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add Feature Request</h2>
            </div>
            <form onSubmit={handleAddFeature} className="p-6 space-y-4">
              <div>
                <Input
                  label="Title"
                  placeholder="Feature title..."
                  value={newFeature.title}
                  onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Textarea
                  label="Description"
                  placeholder="Describe the feature..."
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
                <select
                  value={newFeature.priority}
                  onChange={(e) => setNewFeature({ ...newFeature, priority: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={addingFeature}>
                  {addingFeature ? "Adding..." : "Add Feature"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
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