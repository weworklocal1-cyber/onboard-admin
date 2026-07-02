"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Award, Download, BookOpen } from "lucide-react";

interface Certificate {
  id: string;
  certificate_id: string;
  course: { title: string } | { title: string }[];
  issued_at: string;
  score: number;
}

export default function CertificatesPage() {
  const supabase = createClient();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("academy_certificates")
        .select(`
          id,
          certificate_id,
          course:academy_courses!inner(title),
          issued_at,
          score
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      setCertificates(data || []);
      setLoading(false);
    };
    fetchCertificates();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
        <p className="text-gray-500 mb-4">Complete a course to earn your first certificate</p>
        <a href="/academy/courses" className="inline-block bg-academy-primary text-white px-4 py-2 rounded-lg">
          Browse Courses
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Certificates</h1>
        <p className="text-gray-500">Your earned achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((cert) => (
          <Card key={cert.id} className="border-0 shadow-lg overflow-hidden group">
            <div className="h-48 bg-gradient-to-br from-academy-primary to-academy-secondary relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                <Award className="h-12 w-12 mb-2" />
                <p className="text-xs font-semibold">Certificate of Achievement</p>
              </div>
              <Badge className="absolute top-3 right-3 bg-white/20 text-white border-0">
                {cert.score}%
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 line-clamp-2">
                {Array.isArray(cert.course) ? cert.course[0]?.title : cert.course?.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <BookOpen className="h-4 w-4" />
                {new Date(cert.issued_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <a href={`/academy/certificates/${cert.certificate_id}`} className="flex-1">
                  <button className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1 rounded text-sm">
                    View
                  </button>
                </a>
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const token = (await supabase.auth.getSession()).data.session?.access_token;
                    if (!token) return;
                    const res = await fetch(`/api/academy/certificates/${cert.certificate_id}/pdf`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) return;
                    const html = await res.text();
                    const win = window.open("", "_blank");
                    if (!win) return;
                    win.document.write(html);
                    win.document.close();
                  }}
                  className="flex-1 bg-academy-primary text-white hover:bg-academy-secondary px-3 py-1 rounded text-sm"
                >
                  <Download className="h-4 w-4 inline mr-1" />
                  Download
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}