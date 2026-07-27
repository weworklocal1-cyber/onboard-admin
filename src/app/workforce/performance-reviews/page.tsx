"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";
import { Plus, Trash2, Star } from "lucide-react";

const REVIEW_STATUSES = ['draft', 'submitted', 'reviewed', 'acknowledged'];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-yellow-100 text-yellow-700",
  reviewed: "bg-blue-100 text-blue-700",
  acknowledged: "bg-green-100 text-green-700",
};

export default function PerformanceReviewsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { isAdmin } = usePermissions();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingData, setLoadingingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    reviewer_id: "",
    review_period_start: "",
    review_period_end: "",
    rating: "",
    strengths: "",
    areas_for_improvement: "",
    goals: "",
    overall_comments: "",
    status: "draft",
  });

  const isAdminUser = isAdmin(profile?.role || "");

  useEffect(() => {
    if (!profile) return;
    fetchReviews();
    if (isAdminUser) {
      fetchEmployees();
    }
  }, [profile]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchReviews = async () => {
    setLoadingingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/performance-reviews", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch reviews");
      }

      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoadingingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.review_period_start || !form.review_period_end) {
      toast.error("Employee and review period are required");
      return;
    }

    if (form.rating && (Number(form.rating) < 1 || Number(form.rating) > 5)) {
      toast.error("Rating must be between 1 and 5");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/performance-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          rating: form.rating ? Number(form.rating) : null,
          reviewer_id: form.reviewer_id || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create review");
      }

      toast.success("Performance review created");
      setShowModal(false);
      setForm({
        employee_id: "",
        reviewer_id: "",
        review_period_start: "",
        review_period_end: "",
        rating: "",
        strengths: "",
        areas_for_improvement: "",
        goals: "",
        overall_comments: "",
        status: "draft",
      });
      fetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete this review?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/performance-reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete review");
      }

      toast.success("Review deleted");
      setReviews(reviews.filter((r) => r.id !== reviewId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    }
  };

  const handleUpdateStatus = async (reviewId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/performance-reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update review");
      }

      toast.success("Review updated");
      fetchReviews();
      if (selectedReview?.id === reviewId) {
        setSelectedReview({ ...selectedReview, status });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update review");
    }
  };

  const getRatingDisplay = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Reviews</h1>
          <p className="text-sm text-gray-500">Track and manage employee appraisals</p>
        </div>
        {isAdminUser && (
          <Button onClick={() => setShowModal(true)}>⭐ New Review</Button>
        )}
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No performance reviews found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedReview(review)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">
                        {review.employee?.full_name || "Unknown"}
                      </h3>
                      <Badge className={STATUS_STYLES[review.status] || STATUS_STYLES.draft}>
                        {review.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {review.review_period_start} → {review.review_period_end}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {getRatingDisplay(review.rating)}
                      <span className="text-xs text-gray-400">
                        Reviewer: {review.reviewer?.full_name || "Unknown"}
                      </span>
                    </div>
                  </div>
                  {isAdminUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(review.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">New Performance Review</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={v => setForm({ ...form, employee_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Period Start *</Label>
                  <Input
                    type="date"
                    value={form.review_period_start}
                    onChange={e => setForm({ ...form, review_period_start: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Period End *</Label>
                  <Input
                    type="date"
                    value={form.review_period_end}
                    onChange={e => setForm({ ...form, review_period_end: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={e => setForm({ ...form, rating: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Strengths</Label>
                <Textarea
                  value={form.strengths}
                  onChange={e => setForm({ ...form, strengths: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Areas for Improvement</Label>
                <Textarea
                  value={form.areas_for_improvement}
                  onChange={e => setForm({ ...form, areas_for_improvement: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goals</Label>
                <Textarea
                  value={form.goals}
                  onChange={e => setForm({ ...form, goals: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Overall Comments</Label>
                <Textarea
                  value={form.overall_comments}
                  onChange={e => setForm({ ...form, overall_comments: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Review"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Review Details</h2>
              <Button variant="ghost" onClick={() => setSelectedReview(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedReview.employee?.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedReview.employee?.designation} • {selectedReview.employee?.department}
                  </p>
                </div>
                <Badge className={STATUS_STYLES[selectedReview.status] || STATUS_STYLES.draft}>
                  {selectedReview.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {selectedReview.review_period_start} → {selectedReview.review_period_end}
              </p>
              {getRatingDisplay(selectedReview.rating)}
              {selectedReview.strengths && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Strengths</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedReview.strengths}</p>
                </div>
              )}
              {selectedReview.areas_for_improvement && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Areas for Improvement</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedReview.areas_for_improvement}</p>
                </div>
              )}
              {selectedReview.goals && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Goals</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedReview.goals}</p>
                </div>
              )}
              {selectedReview.overall_comments && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Overall Comments</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedReview.overall_comments}</p>
                </div>
              )}
              {isAdminUser && selectedReview.status === "draft" && (
                <Button
                  className="w-full"
                  onClick={() => handleUpdateStatus(selectedReview.id, "submitted")}
                >
                  Submit Review
                </Button>
              )}
              {isAdminUser && selectedReview.status === "submitted" && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedReview.id, "reviewed")}
                  >
                    Mark as Reviewed
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
