"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";

interface PendingPayment {
  id: string;
  status: string;
  paymentMethod: string;
  upiId: string;
  transactionNote: string;
  proofUrl: string;
  amount: number;
  currency: string;
  createdAt: string;
  userId: string;
  courseId: string;
  courseTitle: string | null;
  courseSlug: string | null;
}

export default function AdminPendingPaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingPayment[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) {
        router.replace("/admin");
        return;
      }

      const res = await fetch("/api/admin/academy/payments/pending", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        router.replace("/admin");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch pending payments");

      const json = await res.json();
      setItems(json.items || []);
    } catch (e) {
      toast.error("Failed to load pending payments");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (orderId: string, action: "approve" | "reject") => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) return;

      const res = await fetch("/api/admin/academy/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          action,
          note: note[orderId] || "",
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(action === "approve" ? "Payment approved" : "Payment rejected");
      setItems((prev) => prev.filter((item) => item.id !== orderId));
      setNote((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (e) {
      toast.error("Failed to process verification");
    }
  };

  if (loading) {
    return <div className="p-6">Loading pending payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pending Payment Verifications</h1>
        <p className="text-gray-500">Review and approve UPI direct payment proofs</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No pending payment verifications
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.courseTitle || "Unknown Course"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Order ID: {item.id}
                        </p>
                      </div>
                      <Badge variant="secondary">{item.paymentMethod}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <p className="font-medium">
                          {item.currency} {item.amount}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">UPI ID:</span>
                        <p className="font-medium">{item.upiId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Submitted:</span>
                        <p className="font-medium">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Course:</span>
                        <p className="font-medium">{item.courseTitle}</p>
                      </div>
                    </div>

                    {item.transactionNote && (
                      <div className="text-sm">
                        <span className="text-gray-500">Note:</span>
                        <p className="font-medium">{item.transactionNote}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Admin Note (optional):
                      </label>
                      <textarea
                        value={note[item.id] || ""}
                        onChange={(e) =>
                          setNote((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Add a note for the user..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => handleVerify(item.id, "approve")}
                        className="flex-1"
                        style={{ backgroundColor: "#22c55e" }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleVerify(item.id, "reject")}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {item.proofUrl && (
                    <div className="md:w-64 shrink-0">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Payment Proof:
                      </p>
                      <a
                        href={item.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={item.proofUrl}
                          alt="Payment proof"
                          className="w-full h-48 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                        />
                        <span className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Click to view full size
                        </span>
                      </a>
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
