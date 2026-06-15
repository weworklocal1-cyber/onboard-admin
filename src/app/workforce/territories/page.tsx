"use client";

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Territory, Profile } from "@/types/workforce";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Haversine formula to calculate distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Fetch restaurants directly from Google Places API (fallback)
async function fetchNearbyRestaurantsFromGoogle(lat: number, lng: number, radius: number): Promise<any[]> {
  try {
    const radiusMeters = Math.min(radius * 1000, 50000); // Max 50km
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === "REQUEST_DENIED") {
      throw new Error("REQUEST_DENIED");
    }
    
    if (data.status === "OK" && Array.isArray(data.results)) {
      return data.results.map((place: any) => ({
        id: place.place_id,
        name: place.name,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        avg_rating: place.rating || 0,
        status: "new_lead",
        locality: place.vicinity || "",
      }));
    }
    return [];
  } catch (e) {
    throw e;
  }
}

export default function TerritoriesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { isAdmin } = usePermissions();
  const [territories, setTerritories] = useState<(Territory & { assigned_executive?: Pick<Profile, 'id' | 'full_name'> })[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTerritory, setNewTerritory] = useState({
    name: "",
    city: "Indore",
    pincodes: "",
    polygon_coords: null as { lat: number; lng: number }[] | null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/territories", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const json = await res.json();
      setTerritories(json.territories || []);
      setExecutives(json.executives || []);
    };

    fetchData();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const initMap = () => {
    if (typeof window === "undefined" || !window.google || !GOOGLE_MAPS_API_KEY) return;
    
    const mapElement = document.getElementById("territory-map-new");
    if (!mapElement) return;

    const defaultCenter = { lat: 22.7196, lng: 75.8577 };
    const map = new window.google.maps.Map(mapElement, {
      center: defaultCenter,
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });

// Click to set territory center and auto-fetch pincodes
    window.google.maps.event.addListener(map, "click", (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      setNewTerritory(prev => ({ ...prev, polygon_coords: [{ lat, lng }] }));
      
      const addMarkers = (restaurants: any[]) => {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        restaurants.forEach((r: any) => {
          const marker = new window.google.maps.Marker({
            position: { lat: r.latitude, lng: r.longitude },
            map,
            title: r.name,
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/restaurant.png",
              scaledSize: new window.google.maps.Size(20, 20),
            },
          });
          markersRef.current.push(marker);
        });
        if (restaurants.length > 0) {
          toast.success(`${restaurants.length} restaurants found in radius`);
        }
      };
      
      fetchNearbyRestaurants(lat, lng).then(restaurants => {
        if (restaurants.length === 0 && GOOGLE_MAPS_API_KEY) {
          fetchNearbyRestaurantsFromGoogle(lat, lng, radiusKm).then(googleRestaurants => {
            setNearbyRestaurants(googleRestaurants);
            addMarkers(googleRestaurants);
          }).catch(e => {
            console.error("Direct Google Places fetch failed:", e);
            addMarkers([]);
          });
        } else {
          addMarkers(restaurants);
        }
      });

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === "OK" && results && results[0]) {
          const pincodes = extractPincodesFromGeocode(results);
          if (pincodes.length > 0) {
            setNewTerritory(prev => ({ ...prev, pincodes: pincodes.join(", ") }));
          }
const components = results[0].address_components;
          const cityComponent = components?.find((c: any) => c.types?.includes("locality"));
          const city = cityComponent?.long_name || "";
          setNewTerritory(prev => ({ ...prev, city }));
        }
      });
      setMapInstance(map);
    });
  };

  const loadGoogleMapsScript = () => {
    if (window.google) return Promise.resolve();
    
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(undefined);
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    if (showAddModal && GOOGLE_MAPS_API_KEY) {
      loadGoogleMapsScript().then(() => {
        setTimeout(initMap, 100);
      });
    }
  }, [showAddModal]);

  const extractPincodesFromGeocode = (results: any[]): string[] => {
    const pincodes: string[] = [];
    for (const result of results) {
      const components = result.address_components || [];
      for (const component of components) {
        if (component.types?.includes("postal_code")) {
          pincodes.push(component.long_name);
        }
      }
    }
    return [...new Set(pincodes)];
  };

  const setTerritoryFromLocation = (lat: number, lng: number, results?: any[]) => {
    setNewTerritory(prev => ({
      ...prev,
      polygon_coords: [{ lat, lng }],
      pincodes: "",
    }));

    if (results) {
      const pincodes = extractPincodesFromGeocode(results);
      if (pincodes.length > 0) {
        setNewTerritory(prev => ({ ...prev, pincodes: pincodes.join(", ") }));
      }
    }
  };

  const fetchNearbyRestaurants = async (lat: number, lng: number, radius: number = radiusKm) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/restaurants?lat=${lat}&lng=${lng}&radius=${radius}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      const restaurants = json.restaurants || [];
      setNearbyRestaurants(restaurants);
      return restaurants;
    } catch (err) {
      toast.error("Failed to fetch restaurants");
      return [];
    }
  };

  const handleSearchLocation = () => {
    if (!window.google || !mapInstance || !searchQuery) {
      toast.error("Map not ready. Please wait for map to load.");
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results: any, status: any) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        mapInstance.setCenter(location);
        mapInstance.setZoom(14);
        setNewTerritory(prev => ({ ...prev, city: results[0].address_components?.find((c: any) => c.types?.includes("locality"))?.long_name || "" }));
        setTerritoryFromLocation(location.lat(), location.lng(), results);
        
        fetchNearbyRestaurants(location.lat(), location.lng()).then(restaurants => {
          markersRef.current.forEach(m => m.setMap(null));
          markersRef.current = [];
          restaurants.forEach((r: any) => {
            const marker = new window.google.maps.Marker({
              position: { lat: r.latitude, lng: r.longitude },
              map: mapInstance,
              title: r.name,
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/restaurant.png",
                scaledSize: new window.google.maps.Size(20, 20),
              },
            });
            markersRef.current.push(marker);
          });
        });
        
        toast.success("Location found!");
      } else if (status === "REQUEST_DENIED") {
        toast.error("Maps API key missing permissions. Enable Geocoding API in Google Cloud Console.");
      } else {
        toast.error(`Location not found: ${status}`);
      }
    });
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      return;
    }
    if (!mapInstance) {
      toast.error("Map not ready. Please wait for map to load.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        mapInstance.setCenter({ lat: latitude, lng: longitude });
        mapInstance.setZoom(14);
        setTerritoryFromLocation(latitude, longitude);
        
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
          if (status === "OK" && results && results[0]) {
            const components = results[0].address_components;
            const cityComponent = components?.find((c: any) => c.types?.includes("locality"));
            const city = cityComponent?.long_name || "";
            setNewTerritory(prev => ({ ...prev, city }));
            const pincodes = extractPincodesFromGeocode(results);
            if (pincodes.length > 0) {
              setNewTerritory(prev => ({ ...prev, pincodes: pincodes.join(", ") }));
            }
          }
        });
        
        const restaurants = await fetchNearbyRestaurants(latitude, longitude);
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        restaurants.forEach((r: any) => {
          const marker = new window.google.maps.Marker({
            position: { lat: r.latitude, lng: r.longitude },
            map: mapInstance,
            title: r.name,
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/restaurant.png",
              scaledSize: new window.google.maps.Size(20, 20),
            },
          });
          markersRef.current.push(marker);
        });
        
        toast.success("Current location selected!");
      },
      (error) => {
        toast.error(`Unable to get current location: ${error.message}`);
      }
    );
  };

  const handleAddTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerritory.name.trim()) {
      toast.error("Territory name is required");
      return;
    }

    setSubmitting(true);

    const pincodesArray = newTerritory.pincodes ? 
      newTerritory.pincodes.split(",").map(p => p.trim()).filter(Boolean) : 
      [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/territories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: newTerritory.name.trim(),
          city: newTerritory.city.trim(),
          pincodes: pincodesArray,
          polygon_coords: newTerritory.polygon_coords,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to add territory");

      toast.success("Territory added!");
      setShowAddModal(false);
      setNewTerritory({ name: "", city: "Indore", pincodes: "", polygon_coords: null });
      setTerritories([result.territory, ...territories]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add territory");
    } finally {
      setSubmitting(false);
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

  const userIsAdmin = isAdmin(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Territories</h1>
          <p className="text-gray-500">Total: {territories.length} territories</p>
        </div>
        {userIsAdmin && (
          <Button onClick={() => setShowAddModal(true)}>📍 Add Territory</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {territories.map(territory => (
          <TerritoryCard key={territory.id} territory={territory} executives={executives} userIsAdmin={userIsAdmin} profileId={profile.id} />
        ))}
        {territories.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            {userIsAdmin 
              ? "No territories found. Click 'Add Territory' to create one."
              : "No territories assigned to you yet. Contact your manager to get a territory assigned."
            }
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add New Territory (Map)</h2>
            </div>
            <form onSubmit={handleAddTerritory} className="p-6 space-y-4">
              {!GOOGLE_MAPS_API_KEY && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">Google Maps API key required for map features. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="name">Territory Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. V Vijay Nagar"
                  value={newTerritory.name}
                  onChange={e => setNewTerritory({ ...newTerritory, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Search Location & Pin on Map</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    disabled={!GOOGLE_MAPS_API_KEY}
                  />
                  <Button type="button" variant="outline" onClick={handleSearchLocation} disabled={!GOOGLE_MAPS_API_KEY}>
                    🔍
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCurrentLocation} disabled={!GOOGLE_MAPS_API_KEY} title="Use current location">
                    📍
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="radius">Radius (km) for Restaurant Discovery</Label>
                <Input
                  id="radius"
                  type="range"
                  min="1"
                  max="50"
                  value={radiusKm}
                  onChange={e => setRadiusKm(parseInt(e.target.value))}
                  disabled={!GOOGLE_MAPS_API_KEY}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1km</span>
                  <span className="font-medium">{radiusKm}km</span>
                  <span>50km</span>
                </div>
                {nearbyRestaurants.length > 0 && (
                  <p className="text-xs text-brand-primary">{nearbyRestaurants.length} restaurants within {radiusKm}km shown on map</p>
                )}
              </div>

              {GOOGLE_MAPS_API_KEY && (
                <div className="space-y-1.5">
                  <div id="territory-map-new" className="h-64 w-full rounded-lg border" />
                  <p className="text-xs text-gray-500">Click on map to set territory location, or use search/current location above</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newTerritory.city}
                  onChange={e => setNewTerritory({ ...newTerritory, city: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Territory"}
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

function TerritoryCard({ territory, executives, userIsAdmin, profileId }: { territory: Territory & { assigned_executive?: Pick<Profile, 'id' | 'full_name'> }; executives: any[]; userIsAdmin: boolean; profileId?: string }) {
  const supabase = createClient();
  const [updating, setUpdating] = useState(false);
  const [territoryRestaurants, setTerritoryRestaurants] = useState<any[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  const loadRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Try nearby by coordinates (if territory has polygon_coords) via secure API
      if (territory.polygon_coords && Array.isArray(territory.polygon_coords) && territory.polygon_coords.length > 0) {
        const firstCoord = territory.polygon_coords[0];
        const lat = firstCoord?.lat;
        const lng = firstCoord?.lng;
        
if (lat && lng) {
           const res = await fetch(`/api/workforce/restaurants?lat=${lat}&lng=${lng}&radius=5`, {
             headers: { Authorization: `Bearer ${session?.access_token}` },
           });
           const json = await res.json();
           if (json.restaurants && json.restaurants.length > 0) {
             setTerritoryRestaurants(json.restaurants.slice(0, 10));
             setLoadingRestaurants(false);
             return;
           }
           
           if (GOOGLE_MAPS_API_KEY) {
             try {
               const googleResults = await fetchNearbyRestaurantsFromGoogle(lat, lng, 5);
               if (googleResults.length > 0) {
                 setTerritoryRestaurants(googleResults.slice(0, 10));
                 setLoadingRestaurants(false);
                 return;
               }
             } catch (e) {
               console.error("Direct Google Places fetch failed:", e);
             }
           }
         }
      }
      
// Fallback to pincodes via API
      if (territory.pincodes && territory.pincodes.length > 0) {
        const pincodesStr = Array.isArray(territory.pincodes) 
          ? territory.pincodes.join(",") 
          : territory.pincodes;
        const res = await fetch(`/api/workforce/restaurants?pincodes=${encodeURIComponent(pincodesStr)}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const json = await res.json();
        if (json.restaurants && json.restaurants.length > 0) {
          setTerritoryRestaurants(json.restaurants.slice(0, 10));
          setLoadingRestaurants(false);
          return;
        }
      }
      
      // Fallback to city via API
      if (territory.city) {
        const res = await fetch(`/api/workforce/restaurants?city=${encodeURIComponent(territory.city)}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const json = await res.json();
        setTerritoryRestaurants((json.restaurants || []).slice(0, 10));
      } else {
        setTerritoryRestaurants([]);
      }
    } catch (err) {
      console.error("Error loading restaurants for territory:", err);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, [territory.pincodes, territory.city, territory.polygon_coords, territory.assigned_executive_id, profileId, userIsAdmin, supabase]);

  const handleAssignExecutive = async (executiveId: string) => {
    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/territories/${territory.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ assigned_executive_id: executiveId === "unassign" ? null : executiveId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to assign");
      toast.success("Executive assigned!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setUpdating(false);
    }
  };

  const TerritoryMap = () => {
    const query = encodeURIComponent(`${territory.name}, ${territory.city}`);
    return (
      <div className="h-32 rounded-lg overflow-hidden">
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${query}&output=embed`}
        />
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-32 bg-gray-50">
        <TerritoryMap />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{territory.name}</span>
          <Badge variant="outline">{territory.city}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-500">
          {territory.pincodes?.length || 0} pincodes assigned
        </p>
        {territory.pincodes && territory.pincodes.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {territory.pincodes.join(", ")}
          </p>
        )}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-600">📍 Nearby Restaurants:</p>
            <Button size="sm" variant="ghost" onClick={loadRestaurants} disabled={loadingRestaurants} title="Search for restaurants">
              🔍
            </Button>
          </div>
          {loadingRestaurants ? (
            <div className="text-xs text-gray-500">Searching...</div>
          ) : territoryRestaurants.length === 0 ? (
            <p className="text-xs text-gray-500">No restaurants found. Click 🔍 to search nearby.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {territoryRestaurants.map((r: any) => (
                <div key={r.id} className="text-xs p-2 bg-gray-50 rounded flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-gray-500 truncate">{r.locality}</div>
                    {r.avg_rating > 0 && (
                      <div className="text-yellow-600">⭐ {r.avg_rating} ({r.review_count || 0} reviews)</div>
                    )}
                  </div>
                  {r.google_place_id && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=restaurant&query_place_id=${r.google_place_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-primary hover:underline ml-1"
                      title="View on Google Maps"
                    >
                      📍
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {userIsAdmin && executives.length > 0 && (
          <select
            value={territory.assigned_executive_id || ""}
            onChange={e => handleAssignExecutive(e.target.value)}
            disabled={updating}
            className="text-xs px-2 py-1 rounded border bg-white mt-1 w-full"
          >
            <option value="">Assign Executive...</option>
            {executives.map((exec) => (
              <option key={exec.id} value={exec.id}>{exec.full_name}</option>
            ))}
          </select>
        )}
        {territory.assigned_executive && (
          <p className="text-xs text-brand-primary pt-1">
            👤 {territory.assigned_executive.full_name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}