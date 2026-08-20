"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  profiles?: { full_name?: string; email?: string };
  academy_courses?: { title: string; slug: string; is_free: boolean; price: number };
  academy_order?: { status: string; amount: number; currency: string; paid_at: string | null } | null;
}

export default function AdminAcademyEnrollmentsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) {
        router.replace("/admin");
        return;
      }

      const res = await fetch("/api/admin/academy/enrollments", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        router.replace("/admin");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch enrollments");
      }

      const json = await res.json();
      setEnrollments(json.data || []);
    } catch (e) {
      console.error("fetchEnrollments failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-blue-100 text-blue-700">Completed</Badge>;
      case "dropped":
        return <Badge variant="secondary">Dropped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
        <p className="text-gray-500">Student enrollments and payment status</p>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-gray-500">
            No enrollments found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">
                      {(enrollment.academy_courses as any)?.title || "Unknown Course"}
                    </h3>
                    {getStatusBadge(enrollment.status)}
                    {(enrollment.academy_courses as any)?.is_free ? (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">Free</Badge>
                    ) : (
                      <Badge variant="default" className="bg-yellow-100 text-yellow-700">
                        Paid • {(enrollment.academy_order as any)?.status || "N/A"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {(enrollment.profiles as any)?.full_name || (enrollment.profiles as any)?.email || "Unknown User"}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                    {enrollment.completed_at && (
                      <span>Completed: {new Date(enrollment.completed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {(enrollment.academy_courses as any)?.is_free ? (
                    <p className="text-sm font-medium text-gray-600">Free Course</p>
                  ) : (
                    <div>
                      <p className="font-bold">
                        {(enrollment.academy_order as any)?.currency} {(enrollment.academy_order as any)?.amount || 0}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(enrollment.academy_order as any)?.paid_at
                          ? `Paid ${new Date((enrollment.academy_order as any).paid_at).toLocaleDateString()}`
                          : "Not paid"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
