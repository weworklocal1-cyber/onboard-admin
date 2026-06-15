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

  useEffect(() => {
    if (!profile) return;

    const fetchDocuments = async () => {
      let query = supabase.from("hr_documents").select(`*, employee:profiles!employee_id(full_name)`);

      if (profile.role !== "founder" && profile.role !== "super_admin" && profile.role !== "hr_admin") {
        query = query.eq("employee_id", profile.id);
      }

      const { data } = await query.order("created_at", { ascending: false });
      setDocuments(data || []);
    };
    fetchDocuments();
  }, [profile, supabase]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !profile) return;

    setUploading(true);
    try {
      const fileName = `${profile.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("employee-documents").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("hr_documents").insert({
        employee_id: profile.id,
        document_type: documentType,
        file_url: urlData.publicUrl,
        file_name: selectedFile.name,
        uploaded_by: profile.id,
      });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully!");
      setShowUploadModal(false);
      setSelectedFile(null);

      const { data } = await supabase.from("hr_documents")
        .select("*, employee:profiles!employee_id(full_name)")
        .order("created_at", { ascending: false });
      setDocuments(data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
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
        <h1 className="text-2xl font-bold">HR Documents</h1>
        <Button onClick={() => setShowUploadModal(true)}>📄 Upload Document</Button>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Upload Document</h2>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
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
                <CardTitle className="text-sm">{doc.file_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline">{HR_DOCUMENT_LABELS[doc.document_type]}</Badge>
                <p className="text-xs text-gray-500">{doc.employee?.full_name}</p>
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