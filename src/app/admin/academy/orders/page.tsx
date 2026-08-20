"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_gateway: string;
  gateway_order_id: string;
  gateway_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  profiles?: { full_name?: string; email?: string };
  academy_courses?: { title: string; slug: string };
}

type StatusFilter = "all" | "paid" | "pending" | "failed" | "cancelled" | "refunded";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

export default function AdminOrdersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const token = sessionStorage.getItem("adminAuthToken");
      if (!token) {
        router.replace("/admin");
        return;
      }

      let url = "/api/admin/academy/orders";
      if (filter !== "all") {
        url += `?status=${filter}`;
      }

      const res = await fetch(url, {
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
        throw new Error("Failed to fetch orders");
      }

      const json = await res.json();
      setOrders(json.data || []);
    } catch (e) {
      console.error("fetchOrders failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-700">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-600 border-red-200">Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-gray-600">Cancelled</Badge>;
      case "refunded":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Refunded</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500">Manage course purchases and payments</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-academy-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-gray-500">
            No orders found for the selected filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-gray-400">{order.currency}</span>
                  </div>
                  <h3 className="font-semibold">
                    {(order.academy_courses as any)?.title || "Unknown Course"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {(order.profiles as any)?.full_name || (order.profiles as any)?.email || "Unknown User"}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>Order: {order.gateway_order_id}</span>
                    {order.gateway_payment_id && <span>Payment: {order.gateway_payment_id}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">
                    {order.currency} {order.amount}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString()}
                    {order.paid_at && ` • Paid ${new Date(order.paid_at).toLocaleDateString()}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
