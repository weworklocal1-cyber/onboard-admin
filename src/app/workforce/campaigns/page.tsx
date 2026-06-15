"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { MarketingCampaign, CampaignAssignment, CampaignStatus, AssignmentStatus } from "@/types/workforce";
import { canManageMarketing } from "@/types/workforce";

const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  assigned: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-purple-100 text-purple-700',
};

export default function CampaignsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [assignments, setAssignments] = useState<CampaignAssignment[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    budget: "",
    start_date: "",
    end_date: "",
    campaign_type: "social_media" as string,
    target_reach: "",
  });

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const [{ data: campaignData }, { data: assignmentData }] = await Promise.all([
        supabase.from("marketing_campaigns")
          .select("*, creator:profiles!created_by(full_name)")
          .order("created_at", { ascending: false }),
        supabase.from("campaign_assignments")
          .select("*, campaign:marketing_campaigns!campaign_id(name), influencer:influencers!influencer_id(full_name, instagram_handle)")
          .order("assigned_at", { ascending: false }),
      ]);
      setCampaigns(campaignData || []);
      setAssignments(assignmentData || []);
    };
    fetchData();
  }, [profile, supabase]);

  const handleCreateCampaign = async () => {
    if (!profile || !newCampaign.name) return;

    const { error } = await supabase.from("marketing_campaigns").insert({
      name: newCampaign.name,
      description: newCampaign.description,
      budget: parseFloat(newCampaign.budget) || null,
      start_date: newCampaign.start_date || null,
      end_date: newCampaign.end_date || null,
      campaign_type: newCampaign.campaign_type,
      target_reach: parseInt(newCampaign.target_reach) || null,
      created_by: profile.id,
    });

    if (!error) {
      setShowCreateForm(false);
      setNewCampaign({ name: "", description: "", budget: "", start_date: "", end_date: "", campaign_type: "social_media", target_reach: "" });
      const { data } = await supabase.from("marketing_campaigns")
        .select("*, creator:profiles!created_by(full_name)");
      setCampaigns(data || []);
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
        <h1 className="text-2xl font-bold">Marketing Campaigns</h1>
        {canManageMarketing(profile.role) && (
          <Button onClick={() => setShowCreateForm(true)}>📢 Create Campaign</Button>
        )}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Campaign name"
              value={newCampaign.name}
              onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newCampaign.description}
              onChange={e => setNewCampaign({ ...newCampaign, description: e.target.value })}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                type="number"
                placeholder="Budget (₹)"
                value={newCampaign.budget}
                onChange={e => setNewCampaign({ ...newCampaign, budget: e.target.value })}
              />
              <Input
                type="date"
                value={newCampaign.start_date}
                onChange={e => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
              />
              <Input
                type="date"
                value={newCampaign.end_date}
                onChange={e => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={newCampaign.campaign_type}
                onChange={e => setNewCampaign({ ...newCampaign, campaign_type: e.target.value })}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="social_media">Social Media</option>
                <option value="influencer">Influencer</option>
                <option value="email">Email</option>
                <option value="event">Event</option>
                <option value="paid_ads">Paid Ads</option>
              </select>
              <Input
                type="number"
                placeholder="Target Reach"
                value={newCampaign.target_reach}
                onChange={e => setNewCampaign({ ...newCampaign, target_reach: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateCampaign} disabled={!newCampaign.name}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Campaigns</h2>

        {campaigns.length === 0 ? (
          <p className="text-gray-500">No campaigns created yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Influencer Assignments</h2>

        {assignments.length === 0 ? (
          <p className="text-gray-500">No assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map(assignment => (
              <AssignmentRow key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: MarketingCampaign }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{campaign.name}</span>
          <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status]}>
            {campaign.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-600">{campaign.description}</p>
        <p className="text-sm font-medium">
          Budget: {campaign.budget ? `₹${campaign.budget.toLocaleString()}` : 'Not set'}
        </p>
        <p className="text-xs text-gray-500">
          Created by: {campaign.creator?.full_name || 'Unknown'}
        </p>
      </CardContent>
    </Card>
  );
}

function AssignmentRow({ assignment }: { assignment: CampaignAssignment }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div>
        <p className="font-medium">{assignment.influencer?.full_name}</p>
        <p className="text-sm text-gray-500">@{assignment.influencer?.instagram_handle}</p>
        <p className="text-xs text-gray-400">{assignment.campaign?.name}</p>
      </div>
      <Badge className={ASSIGNMENT_STATUS_COLORS[assignment.status]}>
        {assignment.status}
      </Badge>
    </div>
  );
}