"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

type ProjectStatus = "active" | "completed" | "paused" | "archived";
type SprintStatus = "planned" | "active" | "completed" | "cancelled";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Sprint {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: SprintStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  paused: "bg-yellow-100 text-yellow-700",
  archived: "bg-red-100 text-red-700",
};

const SPRINT_STATUS_COLORS: Record<SprintStatus, string> = {
  planned: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function ProjectsPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"projects" | "sprints">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "active" as ProjectStatus,
    start_date: "",
    end_date: "",
  });

  const [sprintForm, setSprintForm] = useState({
    project_id: "",
    name: "",
    description: "",
    status: "planned" as SprintStatus,
    start_date: "",
    end_date: "",
  });

  async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return undefined;
    return { Authorization: `Bearer ${session.access_token}` };
  }

  useEffect(() => {
    if (authLoading || !profile) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const headers = await getAuthHeader();
        const [projectsRes, sprintsRes] = await Promise.all([
          fetch("/api/workforce/projects", headers ? { headers } : undefined),
          fetch("/api/workforce/sprints", headers ? { headers } : undefined),
        ]);

        if (!projectsRes.ok) throw new Error("Failed to load projects");
        if (!sprintsRes.ok) throw new Error("Failed to load sprints");

        const projectsData = await projectsRes.json();
        const sprintsData = await sprintsRes.json();

        if (active) {
          setProjects(projectsData.projects || []);
          setSprints(sprintsData.sprints || []);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [profile, authLoading]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectForm.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setSaving(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/workforce/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader.Authorization } : {}),
        },
        body: JSON.stringify(projectForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create project");
      }

      const data = await res.json();
      setProjects((prev) => [data.project, ...prev]);
      setProjectForm({ name: "", description: "", status: "active", start_date: "", end_date: "" });
      setShowProjectForm(false);
      toast.success("Project created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  async function createSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!sprintForm.project_id || !sprintForm.name.trim()) {
      toast.error("Project and sprint name are required");
      return;
    }

    setSaving(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/workforce/sprints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader.Authorization } : {}),
        },
        body: JSON.stringify(sprintForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create sprint");
      }

      const data = await res.json();
      setSprints((prev) => [data.sprint, ...prev]);
      setSprintForm({ project_id: "", name: "", description: "", status: "planned", start_date: "", end_date: "" });
      setShowSprintForm(false);
      toast.success("Sprint created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create sprint");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: string) {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`/api/workforce/projects/${id}`, {
        method: "DELETE",
        headers: authHeader ? { Authorization: authHeader.Authorization } : undefined,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete project");
      }

      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSprints((prev) => prev.filter((s) => s.project_id !== id));
      toast.success("Project deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSprint(id: string) {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`/api/workforce/sprints/${id}`, {
        method: "DELETE",
        headers: authHeader ? { Authorization: authHeader.Authorization } : undefined,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete sprint");
      }

      setSprints((prev) => prev.filter((s) => s.id !== id));
      toast.success("Sprint deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sprint");
    } finally {
      setLoading(false);
    }
  }

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id, label: p.name })), [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects & Sprints</h1>
          <p className="text-sm text-gray-500">
            Organize work into projects and time-boxed sprints.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "projects" ? "default" : "outline"}
          onClick={() => setTab("projects")}
        >
          Projects ({projects.length})
        </Button>
        <Button
          variant={tab === "sprints" ? "default" : "outline"}
          onClick={() => setTab("sprints")}
        >
          Sprints ({sprints.length})
        </Button>
      </div>

      {tab === "projects" && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Projects</CardTitle>
              <Button size="sm" onClick={() => setShowProjectForm(!showProjectForm)}>
                <Plus className="h-4 w-4 mr-1" /> New Project
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showProjectForm && (
              <form onSubmit={createProject} className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="project-name">Name</Label>
                  <Input
                    id="project-name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Project name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="project-status">Status</Label>
                  <Select
                    value={projectForm.status}
                    onValueChange={(value: ProjectStatus) => setProjectForm((f) => ({ ...f, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="project-start">Start date</Label>
                  <Input
                    id="project-start"
                    type="date"
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="project-end">End date</Label>
                  <Input
                    id="project-end"
                    type="date"
                    value={projectForm.end_date}
                    onChange={(e) => setProjectForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Project overview"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowProjectForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Create Project"}
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No projects yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{project.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={PROJECT_STATUS_COLORS[project.status]}>{project.status}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => deleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                      {project.start_date && <span>Start: {project.start_date}</span>}
                      {project.end_date && <span>End: {project.end_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "sprints" && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Sprints</CardTitle>
              <Button size="sm" onClick={() => setShowSprintForm(!showSprintForm)} disabled={projects.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> New Sprint
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showSprintForm && (
              <form onSubmit={createSprint} className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="sprint-project">Project</Label>
                  <Select
                    value={sprintForm.project_id}
                    onValueChange={(value) => setSprintForm((f) => ({ ...f, project_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sprint-name">Name</Label>
                  <Input
                    id="sprint-name"
                    value={sprintForm.name}
                    onChange={(e) => setSprintForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Sprint name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sprint-status">Status</Label>
                  <Select
                    value={sprintForm.status}
                    onValueChange={(value: SprintStatus) => setSprintForm((f) => ({ ...f, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sprint-start">Start date</Label>
                  <Input
                    id="sprint-start"
                    type="date"
                    value={sprintForm.start_date}
                    onChange={(e) => setSprintForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sprint-end">End date</Label>
                  <Input
                    id="sprint-end"
                    type="date"
                    value={sprintForm.end_date}
                    onChange={(e) => setSprintForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="sprint-description">Description</Label>
                  <Textarea
                    id="sprint-description"
                    value={sprintForm.description}
                    onChange={(e) => setSprintForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Sprint goal"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowSprintForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Create Sprint"}
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : sprints.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {projects.length === 0
                  ? "Create a project first, then add sprints."
                  : "No sprints yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {sprints.map((sprint) => {
                  const project = projects.find((p) => p.id === sprint.project_id);
                  return (
                    <div
                      key={sprint.id}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{sprint.name}</p>
                          <p className="text-xs text-gray-500">
                            {project?.name} • {sprint.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={SPRINT_STATUS_COLORS[sprint.status]}>{sprint.status}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => deleteSprint(sprint.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                        {sprint.start_date && <span>Start: {sprint.start_date}</span>}
                        {sprint.end_date && <span>End: {sprint.end_date}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
