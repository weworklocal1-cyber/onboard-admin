"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Restaurant, RestaurantStatus, RESTAURANT_STATUS_LABELS, RESTAURANT_STATUS_COLORS, LeadSource, InteractionType } from "@/types/workforce";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";

const STATUS_FILTERS: RestaurantStatus[] = [
  "new_lead",
  "contacted",
  "interested",
  "follow_up_required",
  "documents_pending",
  "onboarding_in_progress",
  "onboarded",
  "live",
  "rejected",
  "closed_permanently",
];

const EXPIRY_DAYS = {
  fssai: 365,
  gst: 365,
  bank_details: 180,
};

function getExpiryWarning(documentType: string, uploadedAt: string): string | null {
  const days = EXPIRY_DAYS[documentType as keyof typeof EXPIRY_DAYS];
  if (!days) return null;
  const uploadDate = new Date(uploadedAt);
  const expiryDate = new Date(uploadDate.getTime() + days * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
  if (daysRemaining <= 0) return "Expired";
  if (daysRemaining <= 30) return `${daysRemaining}d left`;
  return null;
}

export default function RestaurantsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<RestaurantStatus | "">("");
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    address: "",
    locality: "",
    city: "Indore",
    pincode: "",
    latitude: "",
    longitude: "",
    lead_source: "field_visit" as LeadSource,
    assign_to_self: false,
  });

  const fetchRestaurants = async () => {
    if (!profile) return;
    setLoadingRestaurants(true);
    let query = supabase.from("restaurants").select(`
      *,
      interactions:restaurant_interactions(
        interacted_at,
        interaction_type,
        outcome,
        notes,
        executive:profiles(full_name)
      )
    `);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const [{ data }, execData] = await Promise.all([
      query.order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("role", "onboarding_executive"),
    ]);
    // Sort interactions by date (oldest first) for timeline view
    const sortedData = (data || []).map((r: any) => ({
      ...r,
      interactions: r.interactions ? [...r.interactions].sort((a: any, b: any) => 
        new Date(a.interacted_at).getTime() - new Date(b.interacted_at).getTime()
      ) : []
    }));
    setRestaurants(sortedData);
    setExecutives(execData?.data || []);
    setLoadingRestaurants(false);
  };

  useEffect(() => {
    fetchRestaurants();
  }, [profile, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...newRestaurant,
          latitude: newRestaurant.latitude ? parseFloat(newRestaurant.latitude) : undefined,
          longitude: newRestaurant.longitude ? parseFloat(newRestaurant.longitude) : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to add restaurant");
      toast.success("Restaurant added successfully!");
      setShowAddModal(false);
      setNewRestaurant({
        name: "",
        owner_name: "",
        owner_phone: "",
        owner_email: "",
        address: "",
        locality: "",
        city: "Indore",
        pincode: "",
        latitude: "",
        longitude: "",
        lead_source: "field_visit",
        assign_to_self: false,
      });
      fetchRestaurants();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add restaurant");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.owner_name && r.owner_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    const { error } = await supabase
      .from("restaurants")
      .update({ status: bulkStatus })
      .in("id", selectedIds);
    if (!error) {
      toast.success(`Updated ${selectedIds.length} restaurants`);
      setSelectedIds([]);
      setBulkStatus("");
      fetchRestaurants();
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRestaurants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRestaurants.map(r => r.id));
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
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <Button onClick={() => setShowAddModal(true)}>➕ Add Restaurant</Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <Input
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RestaurantStatus | "all")}
          className="rounded-lg border border-input bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          {STATUS_FILTERS.map(status => (
            <option key={status} value={status}>
              {RESTAURANT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as RestaurantStatus)}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm"
            >
              <option value="">Bulk Action...</option>
              {STATUS_FILTERS.map(status => (
                <option key={status} value={status}>{RESTAURANT_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleBulkStatusChange} disabled={!bulkStatus}>
              Update {selectedIds.length}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        )}
      </div>

<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
{loadingRestaurants ? (
            <p>Loading...</p>
          ) : filteredRestaurants.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-8">No restaurants found</p>
          ) : (
            filteredRestaurants.map(restaurant => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                executives={executives}
                selected={selectedIds.includes(restaurant.id)}
                onToggleSelect={(id) => {
                  setSelectedIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((i) => i !== id)
                      : [...prev, id]
                  );
                }}
              />
            ))
          )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add New Restaurant</h2>
            </div>
            <form onSubmit={handleAddRestaurant} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Restaurant Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Sharma's Kitchen"
                  value={newRestaurant.name}
                  onChange={e => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  placeholder="e.g. Ramesh Sharma"
                  value={newRestaurant.owner_name}
                  onChange={e => setNewRestaurant({ ...newRestaurant, owner_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="owner_phone">Owner Phone</Label>
                  <Input
                    id="owner_phone"
                    placeholder="+91 98765 43210"
                    value={newRestaurant.owner_phone}
                    onChange={e => setNewRestaurant({ ...newRestaurant, owner_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    placeholder="owner@restaurant.com"
                    value={newRestaurant.owner_email}
                    onChange={e => setNewRestaurant({ ...newRestaurant, owner_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Full address"
                  value={newRestaurant.address}
                  onChange={e => setNewRestaurant({ ...newRestaurant, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="locality">Locality</Label>
                  <Input
                    id="locality"
                    placeholder="Area"
                    value={newRestaurant.locality}
                    onChange={e => setNewRestaurant({ ...newRestaurant, locality: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Indore"
                    value={newRestaurant.city}
                    onChange={e => setNewRestaurant({ ...newRestaurant, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    placeholder="452001"
                    value={newRestaurant.pincode}
                    onChange={e => setNewRestaurant({ ...newRestaurant, pincode: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <select
                    id="lead_source"
                    value={newRestaurant.lead_source}
                    onChange={e => setNewRestaurant({ ...newRestaurant, lead_source: e.target.value as LeadSource })}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="field_visit">Field Visit</option>
                    <option value="founder">Founder</option>
                    <option value="marketing">Marketing</option>
                    <option value="referral">Referral</option>
                    <option value="walk_in">Walk-in</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    placeholder="GPS lat"
                    value={newRestaurant.latitude}
                    onChange={e => setNewRestaurant({ ...newRestaurant, latitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  placeholder="GPS lng"
                  value={newRestaurant.longitude}
                  onChange={e => setNewRestaurant({ ...newRestaurant, longitude: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Restaurant"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RestaurantCard({ restaurant, executives, selected, onToggleSelect }: { restaurant: Restaurant; executives: any[]; selected: boolean; onToggleSelect: (id: string) => void }) {
  const supabase = createClient();
  const { profile } = useAuth();
  const { isAdmin: checkAdmin } = usePermissions();
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigningExec, setAssigningExec] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const userIsAdmin = profile ? checkAdmin(profile.role) : false;
  const [visitData, setVisitData] = useState({
    interaction_type: "cold_visit" as InteractionType,
    outcome: "",
    notes: "",
    next_follow_up_date: "",
  });
  const [documentData, setDocumentData] = useState({
    document_type: "fssai" as string,
    file: null as File | null,
  });
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/restaurant-documents?restaurant_id=${restaurant.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      setDocuments(json.documents || []);
    };
    fetchDocuments();
  }, [restaurant.id, supabase]);
  const [loggingVisit, setLoggingVisit] = useState(false);

  const handleStatusChange = async (newStatus: RestaurantStatus) => {
    setUpdatingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update status");
      toast.success("Status updated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignExecutive = async (executiveId: string) => {
    setAssigningExec(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ assigned_executive_id: executiveId === "unassign" ? null : executiveId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to assign executive");
      toast.success("Executive assigned!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigningExec(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err.message)
      );
    });
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingVisit(true);
    try {
      const { lat, lng } = await getLocation();
      const { data: { session } } = await createClient().auth.getSession();

      const res = await fetch("/api/workforce/restaurant-interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          interaction_type: visitData.interaction_type,
          outcome: visitData.outcome,
          notes: visitData.notes,
          lat,
          lng,
          next_follow_up: visitData.next_follow_up_date
            ? {
                scheduled_at: `${visitData.next_follow_up_date}T10:00:00`,
                follow_up_type: "visit",
              }
            : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to log visit");

      toast.success("Visit logged successfully!");
      setShowVisitModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to log visit");
    } finally {
      setLoggingVisit(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentData.file) {
      toast.error("Please select a file");
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("restaurant_id", restaurant.id);
      formData.append("document_type", documentData.document_type);
      formData.append("file", documentData.file);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/restaurant-documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to upload document");

      toast.success("Document uploaded!");
      setShowDocumentModal(false);
      setDocumentData({ document_type: "fssai", file: null });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(restaurant.id)}
                className="h-4 w-4"
              />
              <span>{restaurant.name}</span>
            </div>
            <select
              value={restaurant.status}
              onChange={e => handleStatusChange(e.target.value as RestaurantStatus)}
              disabled={updatingStatus}
              className="text-xs px-2 py-1 rounded border bg-white"
            >
              {STATUS_FILTERS.map(status => (
                <option key={status} value={status} className={RESTAURANT_STATUS_COLORS[status]}>
                  {RESTAURANT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-gray-600">{restaurant.owner_name}</p>
            <p className="text-sm text-gray-500">{restaurant.locality}, {restaurant.city}</p>
          </div>
          {restaurant.avg_rating && (
            <p className="text-sm">⭐ {restaurant.avg_rating} ({restaurant.review_count})</p>
          )}
          <div className="flex flex-col gap-2">
            {/* Founder Quick Actions - Assign Executive */}
            {userIsAdmin && executives.length > 0 && (
              <select
                value={restaurant.assigned_executive_id || ""}
                onChange={e => handleAssignExecutive(e.target.value)}
                disabled={assigningExec}
                className="text-xs px-2 py-1 rounded border bg-white"
              >
                <option value="">Assign Executive...</option>
                {executives.map((exec: any) => (
                  <option key={exec.id} value={exec.id}>{exec.full_name}</option>
                ))}
              </select>
            )}
            {restaurant.owner_phone && (
              <a
                href={`tel:${restaurant.owner_phone}`}
                className="flex-1"
              >
                <Button size="sm" variant="outline" className="w-full">
                  📞 Call
                </Button>
              </a>
            )}
            {restaurant.owner_phone && (
              <a
                href={`https://api.whatsapp.com/send?phone=91${restaurant.owner_phone.replace(/\D/g, "")}&text=${encodeURIComponent(`Hello ${restaurant.owner_name}! 👋

I'm from LocalWala, a food delivery platform serving ${restaurant.city}.

We'd love to partner with ${restaurant.name} to help you reach more customers in your area.

Our platform offers:
✅ Zero commission for first 3 months
✅ Free menu digitisation
✅ Daily payouts directly to your bank

Would you be available for a quick 10-minute call?

Best regards,
LocalWala Team 🍽️`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button size="sm" variant="outline" className="w-full">
                  💬 WhatsApp
                </Button>
              </a>
            )}
            {restaurant.latitude && restaurant.longitude && (
              <a
                href={`https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button size="sm" variant="outline" className="w-full">
                  🗺️ Map
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowVisitModal(true)}
              className="flex-1"
            >
              📍 Log Visit
            </Button>
<Button
              size="sm"
              variant="outline"
              onClick={() => setShowDocumentModal(true)}
              className="flex-1"
            >
              📄 Upload Document
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTimeline(true)}
              className="flex-1"
            >
              📅 Timeline
            </Button>
          </div>
        </CardContent>
      </Card>

      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Log Visit - {restaurant.name}</h2>
            </div>
            <form onSubmit={handleLogVisit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Visit Type</Label>
                <select
                  value={visitData.interaction_type}
                  onChange={e => setVisitData({ ...visitData, interaction_type: e.target.value as InteractionType })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="cold_visit">Cold Visit</option>
                  <option value="follow_up_visit">Follow-up Visit</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="document_collection">Document Collection</option>
                  <option value="onboarding_meeting">Onboarding Meeting</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <select
                  value={visitData.outcome}
                  onChange={e => setVisitData({ ...visitData, outcome: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select outcome</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="follow_up_required">Follow-up Required</option>
                  <option value="documents_collected">Documents Collected</option>
                  <option value="rejected">Rejected</option>
                  <option value="no_response">No Response</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Visit notes..."
                  value={visitData.notes}
                  onChange={e => setVisitData({ ...visitData, notes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="follow_up_date">Next Follow-up Date</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={visitData.next_follow_up_date}
                  onChange={e => setVisitData({ ...visitData, next_follow_up_date: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowVisitModal(false)}
                  disabled={loggingVisit}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loggingVisit}>
                  {loggingVisit ? "Logging..." : "Log Visit (GPS)"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Upload Document - {restaurant.name}</h2>
            </div>
            <form onSubmit={handleDocumentUpload} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <select
                  value={documentData.document_type}
                  onChange={e => setDocumentData({ ...documentData, document_type: e.target.value })}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="fssai">FSSAI License</option>
                  <option value="gst">GST Certificate</option>
                  <option value="pan">PAN Card</option>
                  <option value="bank_details">Bank Details</option>
                  <option value="menu_photos">Menu Photos</option>
                  <option value="storefront_photo">Storefront Photo</option>
                  <option value="partnership_agreement">Partnership Agreement</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setDocumentData({ ...documentData, file: e.target.files?.[0] || null })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDocumentModal(false)}
                  disabled={uploadingDoc}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={uploadingDoc}>
                  {uploadingDoc ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Timeline Modal */}
      {showTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Restaurant Timeline - {restaurant.name}</h2>
            </div>
            <div className="p-6 space-y-4">
              {restaurant.interactions && restaurant.interactions.length > 0 ? (
                <ol className="space-y-3">
                  {restaurant.interactions.map((interaction: any) => (
                    <li key={interaction.id} className="border-l-2 border-brand-primary pl-4 pb-3">
                      <p className="text-sm font-medium">{new Date(interaction.interacted_at).toLocaleString()}</p>
                      <p className="text-xs text-gray-600">{interaction.interaction_type} • {interaction.outcome || "No outcome"}</p>
{interaction.notes && (
                         <p className="text-xs text-gray-500 mt-1">&quot;{interaction.notes}&quot;</p>
                       )}
                      <p className="text-xs text-gray-400 mt-1">by {interaction.executive?.full_name || "System"}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-500">No timeline events yet.</p>
              )}
              <div className="pt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowTimeline(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}