"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Profile, HrDocument, HrDocumentType, HR_DOCUMENT_LABELS } from "@/types/workforce";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function ReportsPage() {
  const { profile } = useAuth();
  const { isAdmin: checkAdmin } = usePermissions();
  const supabase = createClient();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedType, setSelectedType] = useState<HrDocumentType>("offer_letter");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const [{ data: empData }, { data: docData }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("hr_documents")
          .select("*, employee:profiles!employee_id(full_name), uploader:profiles!uploaded_by(full_name)")
          .order("created_at", { ascending: false }),
      ]);
      setEmployees(empData || []);
      setDocuments(docData || []);
    };
    fetchData();
  }, [profile, supabase]);

  const handleUpload = async () => {
    if (!uploadFile || !selectedEmployee || !profile) return;

    setLoading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${selectedEmployee}/${selectedType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('hr_documents')
        .insert({
          employee_id: selectedEmployee,
          document_type: selectedType,
          file_url: urlData.publicUrl,
          file_name: uploadFile.name,
          uploaded_by: profile.id,
        });

      if (insertError) throw insertError;

      setUploadFile(null);
      const { data } = await supabase.from('hr_documents')
        .select("*, employee:profiles!employee_id(full_name), uploader:profiles!uploaded_by(full_name)")
        .order('created_at', { ascending: false });
      setDocuments(data || []);
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : "Upload failed"));
    }
    setLoading(false);
  };

  if (!profile) return null;

  const canManageDocs = checkAdmin(profile.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">HR Documents</h1>

      {canManageDocs && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType as (v: string) => void}>
                <SelectTrigger><SelectValue placeholder="Document type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(HR_DOCUMENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button onClick={handleUpload} disabled={!uploadFile || !selectedEmployee || loading}>
              📤 Upload Document
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Document Library</h2>

        {documents.length === 0 ? (
          <p className="text-gray-500">No documents uploaded yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map(doc => (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{doc.file_name}</span>
                    <Badge>{HR_DOCUMENT_LABELS[doc.document_type]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{doc.employee?.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ReportCard title="Attendance Report" value="📊 View" />
        <ReportCard title="Task Completion" value="📊 View" />
        <ReportCard title="Restaurant Pipeline" value="📊 View" />
        <ReportCard title="EOD Submissions" value="📊 View" />
      </div>
    </div>
  );
}

function ReportCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-2xl">{title.charAt(0)}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-brand-primary">{value}</p>
      </CardContent>
    </Card>
  );
}