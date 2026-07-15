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
  const [userName, setUserName] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [internStartDate, setInternStartDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const fullName = (user.user_metadata?.full_name as string) || (user as any).full_name || "";
      setUserName(fullName);

      const today = new Date();
      setLetterDate(today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setInternStartDate(nextMonth.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

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

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="relative bg-white">
                <img
                  src="/images/internship-letter.png"
                  alt="Internship Appointment Letter"
                  className="w-full h-auto"
                />

                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute text-black font-medium"
                    style={{
                      top: "6.5%",
                      left: "14%",
                      fontSize: "clamp(12px, 1.2vw, 16px)",
                    }}
                  >
                    {letterDate}
                  </div>

                  <div
                    className="absolute text-black font-medium"
                    style={{
                      top: "22%",
                      left: "8%",
                      fontSize: "clamp(12px, 1.2vw, 16px)",
                    }}
                  >
                    {userName},
                  </div>

                  <div
                    className="absolute text-black font-medium"
                    style={{
                      top: "38.5%",
                      left: "10%",
                      right: "10%",
                      fontSize: "clamp(12px, 1.2vw, 16px)",
                    }}
                  >
                    {internStartDate}
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
