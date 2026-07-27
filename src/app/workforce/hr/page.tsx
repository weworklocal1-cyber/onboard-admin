"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { HrDocument, HrDocumentType, HR_DOCUMENT_LABELS } from "@/types/workforce";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const DOCUMENT_TYPES: HrDocumentType[] = [
  "offer_letter",
  "internship_letter",
  "employment_agreement",
  "nda",
  "aadhaar",
  "pan",
  "bank_details",
  "exit_document",
  "other",
];

export default function HrDocumentsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<HrDocumentType>("offer_letter");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isHR = profile?.role === 'founder' || profile?.role === 'super_admin' || profile?.role === 'hr_admin' || profile?.role === 'team_lead';

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/workforce/hr-documents", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }

      if (isHR) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("status", "active")
          .order("full_name");
        setEmployees(data || []);
      }
    }

    load();
  }, [profile, supabase, isHR]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !profile) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("document_type", documentType);
      formData.append("employee_id", isHR && employeeId ? employeeId : profile.id);

      const res = await fetch("/api/workforce/hr-documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload document");
      }

      toast.success("Document uploaded successfully!");
      setShowUploadModal(false);
      setSelectedFile(null);
      setEmployeeId("");

      const documentsRes = await fetch("/api/workforce/hr-documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (documentsRes.ok) {
        const data = await documentsRes.json();
        setDocuments(data.documents || []);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: HrDocument) => {
    setDeletingId(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/workforce/hr-documents/${doc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete document");
      }

      toast.success("Document deleted");
      setDocuments(documents.filter(d => d.id !== doc.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold">HR Documents</h1>
          <p className="text-sm text-gray-500">
            {isHR ? "Manage employee documents" : "View your documents"}
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>📄 Upload Document</Button>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Upload Document</h2>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {isHR && (
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <select
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <select
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value as HrDocumentType)}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type} value={type}>
                      {HR_DOCUMENT_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={!selectedFile || uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documents.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center py-8">No documents uploaded</p>
        ) : (
          documents.map(doc => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle className="text-sm flex items-start justify-between gap-2">
                  <span className="truncate">{doc.file_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{HR_DOCUMENT_LABELS[doc.document_type]}</Badge>
                  {isHR && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {doc.employee?.full_name && (
                  <p className="text-xs text-gray-500">{doc.employee.full_name}</p>
                )}
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="w-full">
                    View Document
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
