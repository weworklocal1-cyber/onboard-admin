"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";

interface CertificateInfo {
  certificate_id: string;
  course_title: string;
  score: number;
  issued_at: string;
}

export default function InternshipApplicationPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [existingApplications, setExistingApplications] = useState<any[]>([]);
  const [hasApplied, setHasApplied] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    certificate_id: "",
    motivation: "",
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileData = {
        full_name: (user.user_metadata?.full_name as string) || (user as any).full_name || "",
        email: user.email || "",
        phone: (user as any).phone || "",
      };

      setForm(f => ({
        ...f,
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
      }));

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
            course_title: course?.title || "Unknown",
            score: c.score || 0,
            issued_at: c.issued_at,
          };
        });
        setCertificates(certs);
        if (certs.length > 0 && !form.certificate_id) {
          setForm(f => ({ ...f, certificate_id: certs[0].certificate_id }));
        }
      }

      const { data: apps } = await supabase.from("internship_applications").select("*").eq("user_id", user.id);
      if (apps && apps.length > 0) setHasApplied(true);
      setExistingApplications(apps || []);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.certificate_id) return;

    setSubmitting(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;

    await fetch("/api/academy/applications", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSubmitting(false);
    setSuccess(true);
    setHasApplied(true);
  };

  if (loading) return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;

  const hasValidCert = certificates.some(c => c.score >= 68);

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
            <p className="text-gray-500 mb-4">Your Mobile Application Development internship application has been received. Our team will review your certificate and get back to you shortly.</p>
            <Badge variant="default" className="mb-4">Pending Review</Badge>
            <div className="flex gap-3 justify-center">
              <a href="/academy/dashboard"><button className="bg-academy-primary text-white px-4 py-2 rounded-lg">Go to Dashboard</button></a>
              <a href="/careers"><button className="border border-gray-200 px-4 py-2 rounded-lg">Browse Opportunities</button></a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application Already Submitted</h1>
            <p className="text-gray-500 mb-4">You have already applied for the Mobile Application Development internship. Check your application status below.</p>
            <div className="space-y-2 mb-4">
              {existingApplications.map((app) => (
                <div key={app.id} className="p-3 rounded-lg bg-gray-50 text-sm flex items-center justify-between">
                  <span>Submitted {new Date(app.created_at).toLocaleDateString()}</span>
                  <Badge variant={app.status === "accepted" ? "default" : app.status === "rejected" ? "warning" : "secondary"}>
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
            <a href="/academy/dashboard"><button className="bg-academy-primary text-white px-4 py-2 rounded-lg">Go to Dashboard</button></a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasValidCert) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Certificate Required</h1>
            <p className="text-gray-500 mb-4">You need to complete a certification course and pass the final assessment (above 68%) before applying for the Mobile Application Development internship.</p>
            <a href="/academy/courses"><button className="bg-academy-primary text-white px-4 py-2 rounded-lg">Browse Certifications</button></a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Apply for Internship</h1>
        <p className="text-gray-500">Mobile Application Development Internship at WeWorkLocal</p>
      </div>

      <Card className="border-0 shadow-lg bg-academy-light">
        <CardContent className="p-4 flex items-start gap-3">
          <GraduationCap className="h-5 w-5 text-academy-primary mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Internship Opportunity: Mobile Application Development</p>
            <p className="text-sm text-gray-600 mt-1">Complete a certification, earn your certificate, and apply for our structured Mobile Application Development internship program.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <Input label="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone Number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Certificate</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academy-primary"
              value={form.certificate_id}
              onChange={(e) => setForm({ ...form, certificate_id: e.target.value })}
            >
              <option value="">Select a certificate</option>
              {certificates.map((cert) => (
                <option key={cert.certificate_id} value={cert.certificate_id}>
                  {cert.course_title} - Score: {cert.score}%
                </option>
              ))}
            </select>
          </div>

          <Textarea label="Motivation Statement" required value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} placeholder="Why do you want to join the Mobile Application Development internship?" />

          <div className="flex gap-2 justify-end pt-2">
            <a href="/academy/dashboard"><button className="border border-gray-200 px-4 py-2 rounded-lg" type="button">Cancel</button></a>
            <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={handleSubmit} disabled={!form.full_name.trim() || !form.email.trim() || !form.certificate_id || !form.motivation.trim() || submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
