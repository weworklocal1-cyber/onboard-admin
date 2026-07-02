"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";

interface Certificate {
  certificate_id: string;
  user_name: string;
  course: { title: string } | { title: string }[];
  issued_at: string;
  score: number;
}

export default function VerifyCertificatePage() {
  const supabase = createClient();
  const [certificateId, setCertificateId] = useState("");
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_certificates")
      .select(`
        certificate_id,
        user_name,
        course:academy_courses!inner(title),
        issued_at,
        score
      `)
      .eq("certificate_id", certificateId)
      .single();

    setCertificate(data as Certificate);
    setVerified(!!data);
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <BookOpen className="h-12 w-12 text-academy-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Verify Certificate</h1>
        <p className="text-gray-500">Check if a certificate is authentic</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Input
            placeholder="Enter Certificate ID"
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
          />
          <button
            className="w-full bg-academy-primary text-white py-2 rounded-lg"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </CardContent>
      </Card>

      {verified && certificate && (
        <Card className="border-academy-primary/20">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="font-semibold">Valid Certificate</p>
            </div>
            <p><strong>Student:</strong> {certificate.user_name}</p>
            <p><strong>Course:</strong> {Array.isArray(certificate.course) ? certificate.course[0]?.title : certificate.course?.title}</p>
            <p><strong>Date:</strong> {new Date(certificate.issued_at).toLocaleDateString()}</p>
            <p><strong>Score:</strong> {certificate.score}%</p>
          </CardContent>
        </Card>
      )}

      {certificateId && !verified && !loading && (
        <Card className="border-red-200">
          <CardContent className="pt-6 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p>Certificate not found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}