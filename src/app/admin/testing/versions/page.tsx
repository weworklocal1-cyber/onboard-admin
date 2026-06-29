"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type AppVersion = {
  id: string;
  version_name: string;
  version_code: number;
  platform: "android" | "ios" | "web";
  release_date: string;
  status: "draft" | "beta" | "stable" | "deprecated";
  release_notes: string;
  file_url: string | null;
  tester_count: number;
  feedback_count: number;
};

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "beta", label: "Beta" },
  { value: "stable", label: "Stable" },
  { value: "deprecated", label: "Deprecated" },
];

const PLATFORM_COLORS: Record<string, string> = {
  android: "bg-green-50 text-green-700 border-green-200",
  ios: "bg-blue-50 text-blue-700 border-blue-200",
  web: "bg-purple-50 text-purple-700 border-purple-200",
};

const VERSION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  beta: "bg-yellow-50 text-yellow-700 border-yellow-200",
  stable: "bg-green-50 text-green-700 border-green-200",
  deprecated: "bg-red-50 text-red-700 border-red-200",
};

export default function VersionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version_name: "",
    version_code: "",
    platform: "android" as "android" | "ios" | "web",
    status: "draft" as "draft" | "beta" | "stable" | "deprecated",
    release_notes: "",
  });
  const [editVersion, setEditVersion] = useState({
    version_name: "",
    version_code: "",
    status: "draft" as "draft" | "beta" | "stable" | "deprecated",
    release_notes: "",
  });
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

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/testing/versions?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch versions");
      const json = await res.json();
      setVersions(json.data || []);
    } catch {
      toast.error("Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking) fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, platformFilter, statusFilter]);

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.version_name.trim() || !newVersion.version_code) {
      toast.error("Version name and code are required");
      return;
    }

    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/testing/versions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          version_name: newVersion.version_name.trim(),
          version_code: parseInt(newVersion.version_code),
          platform: newVersion.platform,
          status: newVersion.status,
          release_notes: newVersion.release_notes.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add version");
      }

      toast.success("Version added successfully");
      setShowAddModal(false);
      setNewVersion({ version_name: "", version_code: "", platform: "android", status: "draft", release_notes: "" });
      fetchVersions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add version");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVersion) return;

    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/testing/versions/${editingVersion.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          version_name: editVersion.version_name,
          version_code: parseInt(editVersion.version_code),
          status: editVersion.status,
          release_notes: editVersion.release_notes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update version");
      }

      toast.success("Version updated successfully");
      setEditingVersion(null);
      fetchVersions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update version");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteVersion = async (version: AppVersion) => {
    if (!confirm(`Delete version ${version.version_name}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/testing/versions/${version.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Version deleted");
      fetchVersions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
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
          <h1 className="text-2xl font-bold">Version Management</h1>
          <p className="text-gray-500">Total: {versions.length} versions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add Version</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Beta Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {versions.filter(v => v.status === "beta").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stable Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {versions.filter(v => v.status === "stable").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Testers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {versions.reduce((acc, v) => acc + v.tester_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Select
          placeholder="All Platforms"
          options={PLATFORM_OPTIONS}
          value={platformFilter}
          onValueChange={setPlatformFilter}
        />
        <Select
          placeholder="All Status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onValueChange={setStatusFilter}
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No versions found</div>
        ) : (
          versions.map((version) => (
            <Card key={version.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{version.version_name}</CardTitle>
                    <p className="text-sm text-gray-500">v{version.version_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={PLATFORM_COLORS[version.platform]}>
                      {version.platform}
                    </Badge>
                    <Badge className={VERSION_STATUS_COLORS[version.status]}>
                      {version.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 line-clamp-3">{version.release_notes || "No release notes"}</p>
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>Testers: {version.tester_count}</span>
                  <span>Feedback: {version.feedback_count}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    Released:{" "}
                    {new Date(version.release_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingVersion(version);
                        setEditVersion({
                          version_name: version.version_name,
                          version_code: String(version.version_code),
                          status: version.status,
                          release_notes: version.release_notes,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteVersion(version)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add New Version</h2>
            </div>
            <form onSubmit={handleAddVersion} className="p-6 space-y-4">
              <div>
<Select
                   label="Platform"
                   options={PLATFORM_OPTIONS.filter(o => o.value !== "all")}
                   value={newVersion.platform}
                   onValueChange={(v) => setNewVersion({ ...newVersion, platform: v as "android" | "ios" | "web" })}
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Version Name"
                    placeholder="e.g. 1.2.0"
                    value={newVersion.version_name}
                    onChange={(e) => setNewVersion({ ...newVersion, version_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Version Code"
                    type="number"
                    placeholder="e.g. 12"
                    value={newVersion.version_code}
                    onChange={(e) => setNewVersion({ ...newVersion, version_code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
<Select
                   label="Status"
                   options={STATUS_OPTIONS.filter(o => o.value !== "all")}
                   value={newVersion.status}
                   onValueChange={(v) => setNewVersion({ ...newVersion, status: v as "draft" | "beta" | "stable" | "deprecated" })}
                 />
              </div>

              <div>
                <Input
                  label="Release Notes"
                  placeholder="What's new in this version?"
                  value={newVersion.release_notes}
                  onChange={(e) => setNewVersion({ ...newVersion, release_notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={updating}>
                  {updating ? "Adding..." : "Add Version"}
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

      {editingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Edit Version</h2>
            </div>
            <form onSubmit={handleUpdateVersion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Version Name"
                    value={editVersion.version_name}
                    onChange={(e) => setEditVersion({ ...editVersion, version_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Version Code"
                    type="number"
                    value={editVersion.version_code}
                    onChange={(e) => setEditVersion({ ...editVersion, version_code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
<Select
                   label="Status"
                   options={STATUS_OPTIONS.filter(o => o.value !== "all")}
                   value={editVersion.status}
                   onValueChange={(v) => setEditVersion({ ...editVersion, status: v as "draft" | "beta" | "stable" | "deprecated" })}
                 />
              </div>

              <div>
                <Input
                  label="Release Notes"
                  value={editVersion.release_notes}
                  onChange={(e) => setEditVersion({ ...editVersion, release_notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingVersion(null)}
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