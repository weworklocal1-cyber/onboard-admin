"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Influencer, InfluencerStatus } from "@/types/workforce";
import { canManageMarketing } from "@/types/workforce";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Award } from "lucide-react";

export default function InfluencersPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInfluencer, setNewInfluencer] = useState({
    full_name: "",
    instagram_handle: "",
    followers_count: "",
    category: "",
    location: "",
  });

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const [{ data: influencerData }, { data: perfData }] = await Promise.all([
        supabase.from("influencers")
          .select("*, assigned_executive:profiles!assigned_executive_id(full_name)")
          .order("created_at", { ascending: false }),
        supabase.from("influencer_performance")
          .select("influencer_id, views, likes, shares, saves, followers_gained")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      
      setInfluencers(influencerData || []);
      
      // Calculate leaderboard metrics
      const agg: Record<string, { views: number; likes: number; shares: number; saves: number; followers_gained: number }> = {};
      perfData?.forEach((p: any) => {
        if (!agg[p.influencer_id]) {
          agg[p.influencer_id] = { views: 0, likes: 0, shares: 0, saves: 0, followers_gained: 0 };
        }
        agg[p.influencer_id].views += p.views || 0;
        agg[p.influencer_id].likes += p.likes || 0;
        agg[p.influencer_id].shares += p.shares || 0;
        agg[p.influencer_id].saves += p.saves || 0;
        agg[p.influencer_id].followers_gained += p.followers_gained || 0;
      });
      
      const lb = Object.entries(agg)
        .map(([id, m]) => ({ influencer_id: id, ...m }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);
      setLeaderboard(lb);
    };

    fetchData();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateInfluencer = async () => {
    if (!profile || !newInfluencer.full_name) return;

    const { error } = await supabase.from("influencers").insert({
      full_name: newInfluencer.full_name,
      instagram_handle: newInfluencer.instagram_handle,
      followers_count: parseInt(newInfluencer.followers_count) || null,
      category: newInfluencer.category,
      location: newInfluencer.location,
    });

    if (!error) {
      setShowCreateForm(false);
      setNewInfluencer({ full_name: "", instagram_handle: "", followers_count: "", category: "", location: "" });
      supabase.from("influencers")
        .select("*, assigned_executive:profiles!assigned_executive_id(full_name)")
        .order("created_at", { ascending: false })
        .then(({ data }) => setInfluencers(data || []));
    }
  };

  if (loading) {
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
        <h1 className="text-2xl font-bold">Influencers</h1>
        {canManageMarketing(profile.role) && (
          <Button onClick={() => setShowCreateForm(true)}>⭐ Add Influencer</Button>
        )}
      </div>

      {/* Leaderboard Section */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" /> Top Performers (by Views)
          </CardTitle>
          <CardDescription>Last 30 days of content performance</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">No performance data yet</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((entry, idx) => {
                const influencer = influencers.find(i => i.id === entry.influencer_id);
                return (
                  <li key={entry.influencer_id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${idx === 0 ? "text-amber-600" : "text-gray-500"}`}>#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{influencer?.full_name || "@"+influencer?.instagram_handle}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-brand-primary font-semibold">{entry.views.toLocaleString()} views</span>
                      <span className="text-gray-500">{entry.likes.toLocaleString()} likes</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Influencer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Full name"
              value={newInfluencer.full_name}
              onChange={e => setNewInfluencer({ ...newInfluencer, full_name: e.target.value })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Instagram handle (@username)"
                value={newInfluencer.instagram_handle}
                onChange={e => setNewInfluencer({ ...newInfluencer, instagram_handle: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Followers count"
                value={newInfluencer.followers_count}
                onChange={e => setNewInfluencer({ ...newInfluencer, followers_count: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Category (food, lifestyle, etc)"
                value={newInfluencer.category}
                onChange={e => setNewInfluencer({ ...newInfluencer, category: e.target.value })}
              />
              <Input
                placeholder="Location"
                value={newInfluencer.location}
                onChange={e => setNewInfluencer({ ...newInfluencer, location: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateInfluencer} disabled={!newInfluencer.full_name}>Add</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {influencers.map(influencer => (
          <InfluencerCard key={influencer.id} influencer={influencer} />
        ))}
      </div>
    </div>
  );
}

function InfluencerCard({ influencer }: { influencer: Influencer }) {
  const supabase = createClient();
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState({
    campaign_id: "",
    content_url: "",
    platform: "instagram" as string,
    views: "",
    likes: "",
    shares: "",
    saves: "",
    comments: "",
    followers_gained: "",
  });

  const handleSubmitMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metrics.campaign_id) {
      toast.error("Campaign is required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/influencer-performance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          influencer_id: influencer.id,
          campaign_id: metrics.campaign_id,
          content_url: metrics.content_url,
          platform: metrics.platform,
          views: parseInt(metrics.views) || 0,
          likes: parseInt(metrics.likes) || 0,
          shares: parseInt(metrics.shares) || 0,
          saves: parseInt(metrics.saves) || 0,
          comments: parseInt(metrics.comments) || 0,
          followers_gained: parseInt(metrics.followers_gained) || 0,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit metrics");

      toast.success("Performance metrics submitted!");
      setShowMetricsModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit metrics");
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_COLORS: Record<InfluencerStatus, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    blacklisted: 'bg-red-100 text-red-700',
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{influencer.full_name}</span>
            <Badge className={STATUS_COLORS[influencer.status]}>{influencer.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">@{influencer.instagram_handle}</p>
          <p className="text-sm text-gray-500">{influencer.category}</p>
          <p className="text-sm font-medium">
            {influencer.followers_count ? `${influencer.followers_count.toLocaleString()} followers` : 'Followers not set'}
          </p>
          <p className="text-xs text-gray-400">{influencer.location}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMetricsModal(true)}
            className="w-full"
          >
            📊 Submit Performance
          </Button>
        </CardContent>
      </Card>

      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Submit Performance - {influencer.full_name}</h2>
            </div>
            <form onSubmit={handleSubmitMetrics} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="campaign_id">Campaign ID *</Label>
                <Input
                  id="campaign_id"
                  placeholder="Campaign UUID"
                  value={metrics.campaign_id}
                  onChange={e => setMetrics({ ...metrics, campaign_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="content_url">Content URL</Label>
                <Input
                  id="content_url"
                  placeholder="https://instagram.com/p/..."
                  value={metrics.content_url}
                  onChange={e => setMetrics({ ...metrics, content_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <select
                    value={metrics.platform}
                    onChange={e => setMetrics({ ...metrics, platform: e.target.value })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="views">Views</Label>
                  <Input
                    id="views"
                    type="number"
                    placeholder="0"
                    value={metrics.views}
                    onChange={e => setMetrics({ ...metrics, views: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="likes">Likes</Label>
                  <Input
                    id="likes"
                    type="number"
                    placeholder="0"
                    value={metrics.likes}
                    onChange={e => setMetrics({ ...metrics, likes: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shares">Shares</Label>
                  <Input
                    id="shares"
                    type="number"
                    placeholder="0"
                    value={metrics.shares}
                    onChange={e => setMetrics({ ...metrics, shares: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="followers_gained">Followers</Label>
                  <Input
                    id="followers_gained"
                    type="number"
                    placeholder="0"
                    value={metrics.followers_gained}
                    onChange={e => setMetrics({ ...metrics, followers_gained: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowMetricsModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}