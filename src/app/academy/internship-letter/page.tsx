"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Download, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface CertificateInfo {
  certificate_id: string;
  score: number;
  issued_at: string;
  course_title: string;
}

export default function InternshipLetterPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [hasValidCert, setHasValidCert] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: certData } = await supabase
        .from("academy_certificates")
        .select(`
          certificate_id,
          score,
          issued_at,
          course:academy_courses!inner(title)
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (certData) {
        const certs = certData.map((c: any) => {
          const course = Array.isArray(c.course) ? c.course[0] : c.course;
          return {
            certificate_id: c.certificate_id,
            score: c.score || 0,
            issued_at: c.issued_at,
            course_title: course?.title || "Unknown",
          };
        });
        setCertificates(certs);
        setHasValidCert(certs.some(c => c.score >= 68));
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  if (!hasValidCert) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Certificate Required</h1>
            <p className="text-gray-500 mb-4">You need to complete a certification course and pass the final assessment (above 68%) to access the internship letter.</p>
            <Link href="/academy/courses">
              <button className="bg-academy-primary text-white px-4 py-2 rounded-lg">Browse Certifications</button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Internship Letter</h1>
        <p className="text-gray-500">Your official internship opportunity letter</p>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-academy-primary to-academy-secondary px-8 py-6">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Internship Opportunity</h2>
              <p className="text-white/80 text-sm">Mobile Application Development Internship at WeWorkLocal</p>
            </div>
          </div>
        </div>

        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">Congratulations!</h3>
              <p className="text-gray-600">You have successfully completed the certification and are now eligible for the Mobile Application Development internship program.</p>
            </div>

            <div className="bg-academy-light rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Program</p>
                  <p className="font-semibold text-gray-900">Mobile Application Development</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Organization</p>
                  <p className="font-semibold text-gray-900">WeWorkLocal / LocalWala</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">3 Months</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mode</p>
                  <p className="font-semibold text-gray-900">Remote / Hybrid</p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Internship Letter</h4>
              </div>
              <div className="p-6">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Award className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500">Internship Letter Placeholder</p>
                    <p className="text-xs text-gray-400">Add your internship letter image to public/images/internship-letter.jpg</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Link href="/academy/dashboard">
                <button className="border border-gray-200 px-4 py-2 rounded-lg">Back to Dashboard</button>
              </Link>
              <button className="bg-academy-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Letter
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
