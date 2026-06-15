"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Department, EmploymentType, JobOpening } from "@/types/workforce";
import { useLookups } from "@/lib/hooks/use-lookup";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";

export default function RecruitmentPage() {
  const { profile, loading } = useAuth();
  const { isLeadOrAbove } = usePermissions();
  const supabase = createClient();
  const { departments, employmentTypes } = useLookups();

  const [jobs, setJobs] = useState<(JobOpening & { hiring_manager?: { full_name: string } })[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "field" as Department,
    employment_type: "full_time" as string,
    openings: "1",
    description: "",
    experience_min: "",
    experience_max: "",
    ctc_min: "",
    ctc_max: "",
    hiring_manager: "",
  });

  const departmentOptions = departments.map((dept) => ({
    value: dept.name,
    label: dept.description || dept.name,
  }));

  const employmentTypeOptions = employmentTypes.map((type) => ({
    value: type.name,
    label: type.label || type.name,
  }));

  useEffect(() => {
    if (!profile) return;
    fetchJobs();
    fetchEmployees();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchJobs = async () => {
    setFetching(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/workforce/hcm/jobs", {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setJobs(json.jobOpenings || []);
    setFetching(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
    setEmployees(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/hcm/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          openings: parseInt(form.openings),
          experience_min: form.experience_min ? parseInt(form.experience_min) : null,
          experience_max: form.experience_max ? parseInt(form.experience_max) : null,
          ctc_min: form.ctc_min ? parseFloat(form.ctc_min) : null,
          ctc_max: form.ctc_max ? parseFloat(form.ctc_max) : null,
          hiring_manager: form.hiring_manager || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create job");
      toast.success("Job opening created!");
      setShowModal(false);
      setForm({ title: "", department: "field", employment_type: "full_time", openings: "1", description: "", experience_min: "", experience_max: "", ctc_min: "", ctc_max: "", hiring_manager: "" });
      fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" /></div>;
  if (!profile) return null;

  const canCreateJobs = isLeadOrAbove(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-gray-500">Manage job openings and candidates</p>
        </div>
        {canCreateJobs && <Button onClick={() => setShowModal(true)}>📌 Add Job Opening</Button>}
      </div>

      {fetching ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📌</p>
          <p className="font-semibold text-gray-600">No job openings yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{job.title}</span>
                  <Badge variant="outline">{job.department}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-500">{job.openings} opening(s)</p>
                <p className="text-xs text-gray-400 capitalize">{job.employment_type.replace(/_/g, " ")}</p>
                {job.ctc_min && <p className="text-xs">₹{job.ctc_min} - ₹{job.ctc_max} CTC</p>}
                <p className="text-xs text-gray-400 mt-2 line-clamp-3">{job.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add Job Opening</h2>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Job Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Department *</Label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value as Department })} className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm">
                    {departmentOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Employment Type *</Label>
                  <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })} className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm">
                    {employmentTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Openings</Label>
                <Input type="number" min="1" value={form.openings} onChange={e => setForm({ ...form, openings: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm" rows={3} />
              </div>
<div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Experience (yrs)</Label>
                  <Input type="number" value={form.experience_min} onChange={e => setForm({ ...form, experience_min: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Experience (yrs)</Label>
                  <Input type="number" value={form.experience_max} onChange={e => setForm({ ...form, experience_max: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Hiring Manager</Label>
                <select
                  value={form.hiring_manager}
                  onChange={e => setForm({ ...form, hiring_manager: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Select —</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CTC Min (LPA)</Label>
                  <Input type="number" value={form.ctc_min} onChange={e => setForm({ ...form, ctc_min: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CTC Max (LPA)</Label>
                  <Input type="number" value={form.ctc_max} onChange={e => setForm({ ...form, ctc_max: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Creating..." : "Create Job"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}