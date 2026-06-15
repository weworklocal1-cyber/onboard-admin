"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Search, MapPin, Star, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantFinderPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [myTerritory, setMyTerritory] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [googleRestaurants, setGoogleRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToCRM, setAddingToCRM] = useState(false);
  const [crmData, setCrmData] = useState({
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (!profile) return;
    
    const fetchTerritory = async () => {
      const { data } = await supabase
        .from("territories")
        .select("*")
        .eq("assigned_executive_id", profile.id)
        .maybeSingle();
      setMyTerritory(data);
    };
    
    fetchTerritory();
  }, [profile, supabase]);

  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let url = `/api/workforce/restaurants?search=${encodeURIComponent(searchQuery)}`;
      if (myTerritory?.polygon_coords?.[0]) {
        const coord = myTerritory.polygon_coords[0];
        url += `&lat=${coord.lat}&lng=${coord.lng}`;
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      setGoogleRestaurants(json.restaurants || []);
    } catch (_err) {
      toast.error("Failed to search restaurants");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCRM = async () => {
    if (!selectedRestaurant) return;
    
    setAddingToCRM(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: selectedRestaurant.name,
          owner_name: crmData.owner_name,
          owner_phone: crmData.owner_phone,
          owner_email: crmData.owner_email,
          address: crmData.address || selectedRestaurant.formatted_address,
          locality: selectedRestaurant.vicinity || "",
          city: myTerritory?.city || "Indore",
          latitude: selectedRestaurant.geometry?.location?.lat,
          longitude: selectedRestaurant.geometry?.location?.lng,
          google_place_id: selectedRestaurant.place_id,
          avg_rating: selectedRestaurant.rating,
          review_count: selectedRestaurant.user_ratings_total,
          notes: crmData.notes,
        }),
      });
      
      if (res.ok) {
        toast.success("Restaurant added to CRM");
        setShowAddModal(false);
        setSelectedRestaurant(null);
        setGoogleRestaurants(prev => prev.filter(r => r.place_id !== selectedRestaurant.place_id));
      }
    } catch (_err) {
      toast.error("Failed to add restaurant");
    } finally {
      setAddingToCRM(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Restaurant Discovery</h1>
          <p className="text-gray-500">Search and add restaurants to CRM from Google Places</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = "/workforce/territories"}>
          Back to Territory Map
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="Search restaurants by name, cuisine, or location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchRestaurants()}
              className="flex-1"
            />
            <Button onClick={searchRestaurants} disabled={loading || !searchQuery.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {googleRestaurants.length === 0 && searchQuery ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-gray-500">No restaurants found. Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {googleRestaurants.map((r: any) => (
            <Card key={r.place_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{r.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" /> {r.vicinity || r.formatted_address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  {r.rating > 0 ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{r.rating}</span>
                      <span className="text-gray-500 text-sm">({r.user_ratings_total || 0} reviews)</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">No ratings yet</span>
                  )}
                  {r.price_level && (
                    <span className="text-sm">{"₹".repeat(r.price_level)}</span>
                  )}
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=restaurant&query_place_id=${r.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline text-sm inline-block"
                >
                  📍 View on Google Maps
                </a>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedRestaurant(r);
                      setShowAddModal(true);
                      setCrmData({
                        owner_name: "",
                        owner_phone: "",
                        owner_email: "",
                        address: r.formatted_address || r.vicinity || "",
                        notes: "",
                      });
                    }}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" /> Add to CRM
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add to CRM: {selectedRestaurant.name}</CardTitle>
              <CardDescription>Enter restaurant contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Owner Name</label>
                <Input
                  value={crmData.owner_name}
                  onChange={e => setCrmData({ ...crmData, owner_name: e.target.value })}
                  placeholder="Restaurant owner name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={crmData.owner_phone}
                  onChange={e => setCrmData({ ...crmData, owner_phone: e.target.value })}
                  placeholder="Owner phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={crmData.owner_email}
                  onChange={e => setCrmData({ ...crmData, owner_email: e.target.value })}
                  placeholder="Owner email"
                  type="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={crmData.address}
                  onChange={e => setCrmData({ ...crmData, address: e.target.value })}
                  placeholder="Restaurant address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={crmData.notes}
                  onChange={e => setCrmData({ ...crmData, notes: e.target.value })}
                  placeholder="Additional notes about this restaurant"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddToCRM} disabled={addingToCRM} className="flex-1">
                  {addingToCRM ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add to CRM
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}