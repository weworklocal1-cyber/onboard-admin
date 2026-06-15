"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { FollowUp, FollowUpType } from "@/types/workforce";
import { toast } from "sonner";

export default function FollowUpsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    restaurant_id: "",
    follow_up_type: "call" as FollowUpType,
    scheduled_at: "",
    notes: "",
    reminder_minutes: 30,
  });

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const [{ data: followUpData }, { data: restaurantListData }] = await Promise.all([
        supabase
          .from("follow_ups")
          .select("*, restaurant:restaurants!restaurant_id(name, owner_name)")
          .eq("assigned_to", profile.id)
          .order("scheduled_at", { ascending: true }),
        supabase.from("restaurants").select("id, name").order("name"),
      ]);
      setFollowUps(followUpData || []);
      setRestaurants(restaurantListData || []);
    };

    fetchData();

    const channel = supabase
      .channel(`follow_ups:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follow_ups",
          filter: `assigned_to=eq.${profile.id}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newFollowUp.restaurant_id || !newFollowUp.scheduled_at) {
      toast.error("Restaurant and date/time are required");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("follow_ups").insert({
      restaurant_id: newFollowUp.restaurant_id,
      follow_up_type: newFollowUp.follow_up_type,
      scheduled_at: newFollowUp.scheduled_at,
      notes: newFollowUp.notes,
      reminder_minutes: newFollowUp.reminder_minutes,
      status: "pending",
      assigned_to: profile.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Follow-up scheduled!");
      setShowAddModal(false);
      setNewFollowUp({ restaurant_id: "", follow_up_type: "call", scheduled_at: "", notes: "", reminder_minutes: 30 });
      supabase
        .from("follow_ups")
        .select("*, restaurant:restaurants!restaurant_id(name, owner_name)")
        .eq("assigned_to", profile.id)
        .order("scheduled_at", { ascending: true })
        .then(({ data }) => setFollowUps(data || []));
    }
    setSubmitting(false);
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
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <Button onClick={() => setShowAddModal(true)}>+ Schedule Follow-up</Button>
      </div>

      <div className="space-y-4">
        {followUps.length === 0 ? (
          <p className="text-gray-500">No follow-ups scheduled.</p>
        ) : (
          followUps.map(followUp => (
            <FollowUpCard key={followUp.id} followUp={followUp} />
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Schedule Follow-up</h2>
            </div>
            <form onSubmit={handleAddFollowUp} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Restaurant *</Label>
                <select
                  value={newFollowUp.restaurant_id}
                  onChange={e => setNewFollowUp({ ...newFollowUp, restaurant_id: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select restaurant</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={newFollowUp.follow_up_type}
                    onChange={e => setNewFollowUp({ ...newFollowUp, follow_up_type: e.target.value as FollowUpType })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="call">Call</option>
                    <option value="visit">Visit</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={newFollowUp.scheduled_at}
                    onChange={e => setNewFollowUp({ ...newFollowUp, scheduled_at: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  placeholder="What to discuss?"
                  value={newFollowUp.notes}
                  onChange={e => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Scheduling..." : "Schedule"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FollowUpCard({ followUp }: { followUp: FollowUp }) {
  const supabase = createClient();
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", followUp.id);
    if (!error) toast.success("Marked completed");
    setCompleting(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "cancelled" })
      .eq("id", followUp.id);
    if (!error) toast.success("Cancelled");
    setCancelling(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
    rescheduled: 'bg-blue-100 text-blue-700',
  };

  const TYPE_ICONS: Record<string, string> = {
    call: '📞',
    visit: '📍',
    whatsapp: '💬',
  };

  const isOverdue = followUp.status === 'pending' && new Date(followUp.scheduled_at) < new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{followUp.restaurant?.name || 'Restaurant'}</span>
          <Badge className={STATUS_COLORS[followUp.status || 'pending']}>
            {followUp.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm">
              {TYPE_ICONS[followUp.follow_up_type]} {followUp.follow_up_type}
            </p>
            <p className="text-sm text-gray-500">
              Owner: {followUp.restaurant?.owner_name || 'Unknown'}
            </p>
            {followUp.notes && (
              <p className="text-xs text-gray-400">{followUp.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {new Date(followUp.scheduled_at).toLocaleString()}
            </p>
{isOverdue && (
               <p className="text-xs text-red-600 font-semibold">⚠ Overdue</p>
             )}
           </div>
         </div>
{followUp.status === 'pending' && (
            <div className="flex gap-2 pt-3">
              <Button size="sm" variant="outline" onClick={handleComplete} disabled={completing}>
                ✅ Complete
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={cancelling}>
                ❌ Cancel
              </Button>
            </div>
          )}
          {followUp.restaurant?.owner_phone && (
            <a
              href={`tel:${followUp.restaurant.owner_phone}`}
              className="pt-2 inline-block"
            >
              <Button size="sm" variant="outline" className="w-full">
                 📞 Call Now
              </Button>
            </a>
          )}
        </CardContent>
      </Card>
    );
  }