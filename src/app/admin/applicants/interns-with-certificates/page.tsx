"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Mail, MessageSquare, CheckCircle2, BookOpen } from "lucide-react";
import { templates, type TemplateKey } from "../../applicants/MessageTemplates";

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  certificate_id?: string;
  motivation?: string;
  resume_url?: string;
  status?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  score?: number;
};

export default function InternsWithCertificatesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("adminAuthToken") : null;
    if (!token) {
      router.replace("/admin");
      return;
    }

    try {
      const [appsRes, cohortRes] = await Promise.all([
        fetch("/api/academy/applications", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/academy/cohorts/confirmed", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!appsRes.ok) throw new Error("Failed to fetch applications");
      const appsJson = await appsRes.json();
      let apps: Application[] = appsJson.applications || [];

      if (cohortRes.ok) {
        const cohortJson = await cohortRes.json();
        setWhatsappGroupLink(cohortJson.whatsappGroupLink || null);
      }

      apps = apps.filter((app: Application) => app.certificate_id);

      const enriched = await Promise.all(
        apps.map(async (app) => {
          try {
            const certRes = await fetch(`/api/academy/certificates/${app.certificate_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (certRes.ok) {
              const certJson = await certRes.json();
              return { ...app, score: certJson.certificate?.score || app.score };
            }
          } catch {}
          return app;
        })
      );

      setApplications(enriched);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleSendEmail = (app: Application) => {
    const tmpl = templates[getTemplateKey(app.status)];
    const subject = encodeURIComponent(tmpl.subject);
    const body = encodeURIComponent(tmpl.body.replace(/{{name}}/g, app.full_name));
    window.open(`mailto:${app.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleWhatsApp = (app: Application) => {
    if (!app.phone) return;
    const tmpl = templates[getTemplateKey(app.status)];
    let text = tmpl.body.replace(/{{name}}/g, app.full_name);

    if (app.status === "confirmed" && whatsappGroupLink) {
      text += `\n\nJoin our WhatsApp group: ${whatsappGroupLink}`;
    }

    const cleanPhone = app.phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendGroupLink = (app: Application) => {
    if (!app.phone || !whatsappGroupLink) return;
    const text = `Hi ${app.full_name},\n\nHere is the WhatsApp group link for the internship program:\n${whatsappGroupLink}\n\nBest regards,\nLocawala Team`;
    const cleanPhone = app.phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleConfirm = async (app: Application) => {
    if (app.status === "confirmed") return;
    const token = typeof window !== "undefined" ? sessionStorage.getItem("adminAuthToken") : null;
    if (!token) {
      alert("Admin session not found. Please log in again.");
      return;
    }

    setConfirmingId(app.id);
    try {
      const res = await fetch(`/api/academy/applications/${app.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to confirm applicant");
        return;
      }

      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: "confirmed" } : a))
      );
    } catch {
      alert("Unexpected error confirming applicant");
    } finally {
      setConfirmingId(null);
    }
  };

  const getTemplateKey = (status?: string): TemplateKey => {
    switch (status) {
      case "confirmed":
      case "accepted":
        return "confirmed";
      case "rejected":
        return "rejected";
      case "reviewed":
        return "followup";
      default:
        return "initial";
    }
  };

  const statusColor = (status?: string): React.CSSProperties => {
    switch (status) {
      case "confirmed":
        return { background: "#dcfce7", color: "#166534" };
      case "accepted":
        return { background: "#dbeafe", color: "#1e40af" };
      case "rejected":
        return { background: "#fee2e2", color: "#991b1b" };
      case "reviewed":
        return { background: "#fef3c7", color: "#92400e" };
      default:
        return { background: "#f3f4f6", color: "#374151" };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interns With Certificates</h1>
          <p className="text-gray-500 text-sm mt-1">Applicants who have completed certification and can be contacted for the internship program</p>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-academy-primary" />
          <span className="text-sm font-medium text-gray-600">{applications.length} certified applicant{applications.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No applicants with certificates yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Name</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Phone</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Certificate</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Score</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Applied On</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-all">
                    <td className="px-5 py-4 text-gray-900 font-semibold">{app.full_name}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleSendEmail(app)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                      >
                        {app.email}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{app.phone || "—"}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-600">{app.certificate_id || "—"}</td>
                    <td className="px-5 py-4">
                      {app.score != null ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          {app.score}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: 500,
                          ...statusColor(app.status),
                        }}
                      >
                        {app.status || "pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleSendEmail(app)}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-all"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </button>

                        {app.phone && (
                          <button
                            onClick={() => handleWhatsApp(app)}
                            className="inline-flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                        )}

                        {app.phone && whatsappGroupLink && (
                          <button
                            onClick={() => handleSendGroupLink(app)}
                            className="inline-flex items-center gap-1.5 text-xs text-white bg-academy-primary hover:bg-academy-secondary rounded-lg px-3 py-1.5 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Send Group Link
                          </button>
                        )}

                        {app.status !== "confirmed" && (
                          <button
                            onClick={() => handleConfirm(app)}
                            disabled={confirmingId === app.id}
                            className="inline-flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg px-3 py-1.5 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {confirmingId === app.id ? "Confirming..." : "Confirm"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
