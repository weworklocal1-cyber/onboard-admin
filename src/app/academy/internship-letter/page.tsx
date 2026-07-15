"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Download, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import "./print.css";

const COMPANY = {
  name: "WeWorkLocal",
  tagline: "India's Smart Local Services & Marketplace Platform",
  email: "weworklocal1@gmail.com",
  phone: "+91 9182793401",
  social: "@weworklocalsupport",
  address: [
    "Dullapally",
    "Dundigal-Gandimaisamma",
    "Medchal-Malkajgiri",
    "Telangana Pin Code: 500100",
  ],
};

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

  const handlePrint = () => {
    window.print();
  };

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
              <div className="bg-white p-8 md:p-12" id="internship-letter-content">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                        WL
                      </div>
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-blue-900">{COMPANY.name}</h1>
                      <p className="text-sm text-gray-500 mt-1">{COMPANY.tagline}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700">Date: <span className="font-semibold">{letterDate}</span></p>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-blue-900 mb-2">INTERNSHIP APPOINTMENT LETTER</h2>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-0.5 w-12 bg-blue-500" />
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="h-0.5 w-12 bg-blue-500" />
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700">To,</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{userName}</p>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700">Subject: <span className="font-semibold">Appointment as Intern – Mobile Application Development</span></p>
                  </div>

                  <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                    <p>Dear <span className="font-semibold">{userName}</span>,</p>

                    <p>
                      We are pleased to inform you that you have been selected as an <strong>Intern – Mobile Application Development</strong> at <strong>{COMPANY.name}</strong>. This selection is based on your successful completion of the certification program through our onboarding portal at <strong>onboard.localwala.tech</strong>. We are confident that your skills and enthusiasm will be a valuable addition to our team.
                    </p>

                    <p>
                      Your internship will commence from <span className="font-semibold">{internStartDate}</span> and will continue for a period of <strong>3 months</strong>, subject to performance and project requirements. During this period, you will be working closely with our development team and contributing to real-time projects that impact users.
                    </p>

                    <p>
                      You will be expected to maintain confidentiality, professionalism, and dedication in all tasks assigned to you.
                    </p>

                    <p>
                      Your performance during the internship will be evaluated, and based on your performance, a full-time opportunity at {COMPANY.name} may be offered.
                    </p>

                    <p>
                      We believe this internship will be a valuable learning experience for you, and we look forward to your growth and meaningful contributions to <strong>{COMPANY.name}</strong>.
                    </p>

                    <p>Welcome aboard! We are excited to have you with us.</p>

                    <p>Sincerely,</p>
                    <p className="font-semibold">Team {COMPANY.name}</p>
                    <p className="text-xs text-gray-500">{COMPANY.name} Private Limited</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Address</p>
                        {COMPANY.address.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        <p className="mt-1">Onboarding Portal: onboard.localwala.tech</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Email</p>
                        <p>{COMPANY.email}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Contact</p>
                        <p>{COMPANY.phone}</p>
                        <p>{COMPANY.social}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Link href="/academy/dashboard">
                <button className="border border-gray-200 px-4 py-2 rounded-lg">Back to Dashboard</button>
              </Link>
              <button
                onClick={handlePrint}
                className="bg-academy-primary text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
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
