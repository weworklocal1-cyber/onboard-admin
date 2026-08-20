"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PriceRequest {
  id: string;
  requested_price: number;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  course_id: string;
  profiles?: { email?: string; full_name?: string };
  academy_courses?: { title: string };
}

export default function AdminPriceRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PriceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) {
        router.replace("/admin");
        return;
      }

      const res = await fetch("/api/admin/academy/price-requests", {
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
        throw new Error("Failed to fetch price requests");
      }

      const json = await res.json();
      setRequests(json.data || []);
    } catch (e) {
      console.error("fetchRequests failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) return;

      const res = await fetch("/api/admin/academy/price-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status, admin_response: adminResponse }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(`Request ${status}`);
      setSelectedId(null);
      setAdminResponse("");
      fetchRequests();
    } catch (e) {
      toast.error("Failed to update request");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return <div className="p-6">Loading price requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Price Requests</h1>
        <p className="text-gray-500">Manage user requests for discounted course pricing</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">No price requests yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="border-0 shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{req.academy_courses?.title || "Unknown Course"}</h3>
                    <p className="text-sm text-gray-500">
                      User: {req.profiles?.email || req.profiles?.full_name || req.user_id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Requested: {req.requested_price} | Status: <Badge className={getStatusColor(req.status)}>{req.status}</Badge>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Reason: {req.reason}</p>
                    {req.admin_response && (
                      <p className="text-sm text-gray-700 mt-2">Admin response: {req.admin_response}</p>
                    )}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedId(req.id);
                          setAdminResponse("");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedId(req.id);
                          setAdminResponse("");
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {selectedId === req.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    <Textarea
                      placeholder="Add a response (optional)"
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateStatus(req.id, "approved")}
                      >
                        Confirm Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(req.id, "rejected")}
                      >
                        Confirm Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
