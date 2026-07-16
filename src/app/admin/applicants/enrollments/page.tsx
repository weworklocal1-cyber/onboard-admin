"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, CheckCircle2, BookOpen, Clock } from "lucide-react";
import { templates, type TemplateKey } from "../../applicants/MessageTemplates";
import AdminAuthGuard from "@/components/auth/admin-auth-guard";

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at?: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  course_title: string;
  course_slug: string;
  course_difficulty: string;
  course_duration: number;
};

export default function AcademyEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("adminAuthToken") : null;
    if (!token) {
      router.replace("/admin");
      return;
    }

    try {
      const [enrollmentsRes, cohortRes] = await Promise.all([
        fetch("/api/admin/academy/enrollments", {
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

      if (enrollmentsRes.status === 401) {
        sessionStorage.removeItem("adminAuthToken");
        sessionStorage.removeItem("adminUser");
        router.replace("/admin");
        return;
      }

      if (!enrollmentsRes.ok) throw new Error("Failed to fetch enrollments");
      const enrollmentsJson = await enrollmentsRes.json();
      setEnrollments(enrollmentsJson.enrollments || []);

      if (cohortRes.ok) {
        const cohortJson = await cohortRes.json();
        setWhatsappGroupLink(cohortJson.whatsappGroupLink || null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleSendEmail = (enrollment: Enrollment) => {
    const tmpl = templates[getTemplateKey(enrollment.status)];
    const subject = encodeURIComponent(tmpl.subject);
    const body = encodeURIComponent(
      tmpl.body.replace(/{{name}}/g, enrollment.user_name)
    );
    window.open(`mailto:${enrollment.user_email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleWhatsApp = (enrollment: Enrollment) => {
    if (!enrollment.user_phone) return;
    const tmpl = templates[getTemplateKey(enrollment.status)];
    let text = tmpl.body.replace(/{{name}}/g, enrollment.user_name);

    if (enrollment.status === "confirmed" && whatsappGroupLink) {
      text += `\n\nJoin our WhatsApp group: ${whatsappGroupLink}`;
    }

    const cleanPhone = enrollment.user_phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendGroupLink = (enrollment: Enrollment) => {
    if (!enrollment.user_phone || !whatsappGroupLink) return;
    const text = `Hi ${enrollment.user_name},\n\nHere is the WhatsApp group link for the internship program:\n${whatsappGroupLink}\n\nBest regards,\nLocawala Team`;
    const cleanPhone = enrollment.user_phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleConfirm = async (enrollment: Enrollment) => {
    if (enrollment.status === "confirmed") return;
    const token = typeof window !== "undefined" ? sessionStorage.getItem("adminAuthToken") : null;
    if (!token) {
      alert("Admin session not found. Please log in again.");
      return;
    }

    setConfirmingId(enrollment.id);
    try {
      const res = await fetch("/api/admin/academy/enrollments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enrollment_id: enrollment.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        sessionStorage.removeItem("adminAuthToken");
        sessionStorage.removeItem("adminUser");
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        alert(data.error || "Failed to confirm enrollment");
        return;
      }

      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollment.id ? { ...e, status: "confirmed" } : e))
      );
    } catch {
      alert("Unexpected error confirming enrollment");
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
      case "completed":
        return { background: "#dbeafe", color: "#1e40af" };
      case "dropped":
        return { background: "#fee2e2", color: "#991b1b" };
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
    <AdminAuthGuard>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Enrollments</h1>
          <p className="text-gray-500 text-sm mt-1">Users enrolled in academy courses and their confirmation status</p>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-academy-primary" />
          <span className="text-sm font-medium text-gray-600">{enrollments.length} enrollment{enrollments.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No enrollments yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">User</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Phone</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Course</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Difficulty</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Enrolled On</th>
                  <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-all">
                    <td className="px-5 py-4 text-gray-900 font-semibold">{enrollment.user_name}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleSendEmail(enrollment)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                      >
                        {enrollment.user_email}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{enrollment.user_phone || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{enrollment.course_title}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{enrollment.course_slug}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 capitalize">
                        {enrollment.course_difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: 500,
                          ...statusColor(enrollment.status),
                        }}
                      >
                        {enrollment.status || "active"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleSendEmail(enrollment)}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-all"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </button>

                        {enrollment.user_phone && (
                          <button
                            onClick={() => handleWhatsApp(enrollment)}
                            className="inline-flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                        )}

                        {enrollment.user_phone && whatsappGroupLink && (
                          <button
                            onClick={() => handleSendGroupLink(enrollment)}
                            className="inline-flex items-center gap-1.5 text-xs text-white bg-academy-primary hover:bg-academy-secondary rounded-lg px-3 py-1.5 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Group Link
                          </button>
                        )}

                        {enrollment.status !== "confirmed" && (
                          <button
                            onClick={() => handleConfirm(enrollment)}
                            disabled={confirmingId === enrollment.id}
                            className="inline-flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg px-3 py-1.5 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {confirmingId === enrollment.id ? "Confirming..." : "Confirm"}
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
      </AdminAuthGuard>
    </div>
  );
}
