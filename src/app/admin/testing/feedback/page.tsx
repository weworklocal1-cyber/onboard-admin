"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Feedback = {
  id: string;
  user_email: string;
  user_name: string | null;
  rating: number;
  category: string;
  message: string;
  app_version: string;
  device_info: string;
  created_at: string;
};

const RATING_COLORS: Record<number, string> = {
  5: "bg-green-50 text-green-700 border-green-200",
  4: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-yellow-50 text-yellow-700 border-yellow-200",
  2: "bg-orange-50 text-orange-700 border-orange-200",
  1: "bg-red-50 text-red-700 border-red-200",
};

export default function FeedbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin");
        return;
      }

      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.push("/admin");
        return;
      }

      setAuthChecking(false);
    };
    checkAuth();
  }, [router, supabase]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/testing/feedback?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      const json = await res.json();
      setFeedback(json.data || []);
    } catch {
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking) fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, categoryFilter, ratingFilter, searchQuery]);

  const handleSearch = () => {
    fetchFeedback();
  };

  const averageRating = feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length || 0;
  const ratingCounts = feedback.reduce((acc, f) => {
    acc[f.rating] = (acc[f.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Analytics</h1>
          <p className="text-gray-500">Total: {feedback.length} responses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {feedback.length > 0 ? averageRating.toFixed(1) : "—"}
            </div>
            <div className="flex text-yellow-400 mt-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < Math.round(averageRating) ? "" : "opacity-30"}>
                  ★
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">5 Star Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratingCounts[5] || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">4 Star Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratingCounts[4] || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Below 3 Stars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(ratingCounts[1] || 0) + (ratingCounts[2] || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>Search</Button>
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="ui">UI/UX</option>
            <option value="performance">Performance</option>
            <option value="other">Other</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading feedback...</div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No feedback found</div>
        ) : (
          feedback.map((fb) => (
            <Card key={fb.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {fb.user_name || fb.user_email}
                  </CardTitle>
                  <Badge className={RATING_COLORS[fb.rating]}>
                    {fb.rating} ★
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Badge variant="outline" className="capitalize">
                    {fb.category}
                  </Badge>
                  {fb.app_version && (
                    <Badge variant="secondary">
                      v{fb.app_version}
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 mb-3">{fb.message}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {fb.user_email && `Email: ${fb.user_email}`}
                  </span>
                  <span>
                    {new Date(fb.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {fb.device_info && (
                  <p className="text-xs text-gray-400 mt-2 truncate">
                    Device: {fb.device_info}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}