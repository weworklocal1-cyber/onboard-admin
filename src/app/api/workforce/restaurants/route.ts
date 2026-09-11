import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { RestaurantStatus, LeadSource } from "@/types/workforce";
import { canAccessRestaurantCRM, isAdmin as isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return profile;
}

// Haversine formula to calculate distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseFloat(searchParams.get("radius") || "10");
  const pincodesParam = searchParams.get("pincodes");
  const cityParam = searchParams.get("city");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  let googleResults = [];
  if (lat && lng && apiKey) {
    try {
      const radiusMeters = radius * 1000;
      const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=restaurant&key=${apiKey}`;
      const googleRes = await fetch(googleUrl);
      const googleData = await googleRes.json();
      
      if (googleData.status === "OK" && Array.isArray(googleData.results)) {
        googleResults = googleData.results.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          avg_rating: place.rating || 0,
          status: "new_lead",
          locality: place.vicinity || "",
          google_place_id: place.place_id,
        }));
        
        // Save to database - upsert with dedupe by google_place_id (requires unique index, handles race)
        for (const place of googleData.results) {
          const name = place.name;
          const placeId = place.place_id;
          const plat = place.geometry?.location?.lat;
          const plng = place.geometry?.location?.lng;
          const rating = place.rating || 0;
          const reviewCount = place.user_ratings_total || 0;
          const address = place.vicinity || "";
          
          if (!placeId) continue;
          
          // Atomic upsert - prevents 48x duplicates from concurrent GETs
          const { error: upsertError } = await supabaseAdmin
            .from("restaurants")
            .upsert({
              name,
              google_place_id: placeId,
              latitude: plat,
              longitude: plng,
              avg_rating: rating,
              review_count: reviewCount,
              address,
              locality: address,
              lead_source: "google_maps",
              status: "new_lead"
            }, { onConflict: "google_place_id", ignoreDuplicates: true });
          
          // Fallback for DBs without unique index yet: try insert, ignore duplicate race
          if (upsertError && upsertError.code !== '23505') {
            console.error("Upsert failed for", placeId, upsertError.message);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching/saving Google Places:", e);
    }
  }

  // Territory isolation for onboarding_executive: only his pincodes/territory
  let execAllowedPincodes: Set<string> | null = null;
  let execTerritoryIds: Set<string> | null = null;
  if (sessionUser.role === "onboarding_executive") {
    const { data: myTerritories } = await supabaseAdmin.from("territories").select("id, pincodes").eq("assigned_executive_id", sessionUser.id);
    if (!myTerritories || myTerritories.length === 0) {
      return NextResponse.json({ restaurants: [], message: "No territory assigned to you" });
    }
    execTerritoryIds = new Set(myTerritories.map((t: any) => t.id));
    execAllowedPincodes = new Set(myTerritories.flatMap((t: any) => t.pincodes || []));
  }

  if (!lat || !lng) {
    if (pincodesParam) {
      const pincodes = pincodesParam.split(",").map(p => p.trim()).filter(Boolean);
      // Enforce territory isolation for exec on pincode query
      if (execAllowedPincodes) {
        const disallowed = pincodes.filter(p => !execAllowedPincodes!.has(p));
        if (disallowed.length > 0) {
          return NextResponse.json({ error: `Forbidden: pincode(s) ${disallowed.join(",")} not in your assigned territory`, allowed: Array.from(execAllowedPincodes) }, { status: 403 });
        }
      }
      const { data: restaurants, error } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, latitude, longitude, status, avg_rating, locality, pincode, city, territory_id, assigned_executive_id")
        .in("pincode", pincodes)
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // Extra RLS-like filter for exec
      let filtered = restaurants || [];
      if (execAllowedPincodes) {
        filtered = filtered.filter((r: any) => execAllowedPincodes!.has(r.pincode) || execTerritoryIds!.has(r.territory_id) || r.assigned_executive_id === sessionUser.id);
      }
      return NextResponse.json({ restaurants: filtered });
    }

    if (cityParam) {
      // Exec can only query city if they have at least one territory in that city
      if (execAllowedPincodes) {
        const { data: myCities } = await supabaseAdmin.from("territories").select("city").eq("assigned_executive_id", sessionUser.id);
        const allowedCities = new Set((myCities || []).map((c: any) => c.city?.toLowerCase()));
        if (!allowedCities.has(cityParam.toLowerCase())) {
          return NextResponse.json({ error: `Forbidden: city ${cityParam} not in your assigned territory`, allowedCities: Array.from(allowedCities) }, { status: 403 });
        }
      }
      const { data: restaurants, error } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, latitude, longitude, status, avg_rating, locality, pincode, city, territory_id, assigned_executive_id")
        .eq("city", cityParam)
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      let filtered = restaurants || [];
      if (execTerritoryIds) {
        filtered = filtered.filter((r: any) => execTerritoryIds!.has(r.territory_id) || execAllowedPincodes!.has(r.pincode) || r.assigned_executive_id === sessionUser.id);
      }
      return NextResponse.json({ restaurants: filtered });
    }

    // Fallback: if no DB results, use Google results (only for admins/leads, exec already blocked above if no territory)
    if (googleResults.length > 0) {
      return NextResponse.json({ restaurants: googleResults });
    }

    return NextResponse.json({ error: "lat/lng or pincodes or city parameter required" }, { status: 400 });
  }

  const { data: restaurants, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, latitude, longitude, status, avg_rating, locality, pincode, city, territory_id, assigned_executive_id")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by radius
  const nearbyRestaurants = (restaurants || []).filter((r: any) => {
    if (!r.latitude || !r.longitude) return false;
    return getDistanceFromLatLonInKm(lat, lng, r.latitude, r.longitude) <= radius;
  });

  // Enforce territory isolation for onboarding_executive on radius search
  if (execAllowedPincodes && execTerritoryIds) {
    const filteredExec = nearbyRestaurants.filter((r: any) => execAllowedPincodes!.has(r.pincode) || execTerritoryIds!.has(r.territory_id) || r.assigned_executive_id === sessionUser.id || !r.pincode);
    // For exec with new territory (medchal 501401 empty), allow Google discovery fallback filtered to territory city if DB empty
    if (filteredExec.length === 0 && googleResults.length > 0) {
      return NextResponse.json({ restaurants: googleResults });
    }
    return NextResponse.json({ restaurants: filteredExec });
  }

  // If we have Google results but no DB results, return Google results (admin/lead only)
  const allRestaurants = nearbyRestaurants.length > 0 ? nearbyRestaurants : googleResults;

  return NextResponse.json({ restaurants: allRestaurants });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canAccessRestaurantCRM(sessionUser.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      owner_name,
      owner_phone,
      owner_email,
      address,
      locality,
      city,
      pincode,
      latitude,
      longitude,
      cuisine_types,
      lead_source,
      assign_to_self,
    } = body as {
      name: string;
      owner_name?: string;
      owner_phone?: string;
      owner_email?: string;
      address?: string;
      locality?: string;
      city?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
      cuisine_types?: string[];
      lead_source?: LeadSource;
      assign_to_self?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
    }

    // --- Dedupe on manual create ---
    // 1) If google_place_id provided, dedupe by it
    const incomingPlaceId = (body as any).google_place_id?.trim();
    if (incomingPlaceId) {
      const { data: existingByPlaceId } = await supabaseAdmin.from("restaurants").select("*").eq("google_place_id", incomingPlaceId).maybeSingle();
      if (existingByPlaceId) {
        return NextResponse.json({ success: true, restaurant: existingByPlaceId, deduped: true, message: "Restaurant already exists (same Google Place ID) - returned existing" });
      }
    }
    // 2) Dedupe by normalized name + phone + city (prevents field_visit duplicates)
    const normalizedName = name.trim().toLowerCase();
    const normalizedPhone = owner_phone?.trim() || null;
    if (normalizedPhone) {
      const { data: existingByPhone } = await supabaseAdmin.from("restaurants").select("*").ilike("name", name.trim()).eq("owner_phone", normalizedPhone).eq("city", (city?.trim() || "Indore")).maybeSingle();
      if (existingByPhone) {
        return NextResponse.json({ success: false, error: "Duplicate: restaurant with same name and phone already exists in this city", existing: existingByPhone }, { status: 409 });
      }
    } else {
      // Fallback: name + locality + city fuzzy dedupe (exact match)
      const normLocality = locality?.trim() || null;
      if (normLocality) {
        const { data: existingByLocality } = await supabaseAdmin.from("restaurants").select("*").ilike("name", name.trim()).ilike("locality", normLocality).eq("city", (city?.trim() || "Indore")).maybeSingle();
        if (existingByLocality) {
          return NextResponse.json({ success: false, error: "Duplicate: restaurant with same name and locality already exists", existing: existingByLocality }, { status: 409 });
        }
      }
    }

    const insertData: Record<string, any> = {
      name: name.trim(),
      owner_name: owner_name?.trim() || null,
      owner_phone: owner_phone?.trim() || null,
      owner_email: owner_email?.trim() || null,
      address: address?.trim() || null,
      locality: locality?.trim() || null,
      city: city?.trim() || "Indore",
      pincode: pincode?.trim() || null,
      latitude,
      longitude,
      cuisine_types: cuisine_types || [],
      lead_source: lead_source || "field_visit",
      status: "new_lead" as RestaurantStatus,
    };

    if (assign_to_self && !(await isAdminRole(sessionUser.role))) {
      insertData.assigned_executive_id = sessionUser.id;
    }

    // Auto-assign territory_id based on pincode + conflict prevention (PRD 18.2:4)
    if (insertData.pincode) {
      const { data: matchedTerritory } = await supabaseAdmin.from("territories").select("id, name, city, assigned_executive_id, pincodes").contains("pincodes", [insertData.pincode]).maybeSingle();
      if (matchedTerritory) {
        insertData.territory_id = (matchedTerritory as any).id;
        // Conflict prevention: if pincode belongs to territory assigned to another exec
        const territoryExec = (matchedTerritory as any).assigned_executive_id;
        if (territoryExec && territoryExec !== sessionUser.id) {
          const isAdmin = await isAdminRole(sessionUser.role);
          if (sessionUser.role === "onboarding_executive" && !isAdmin) {
            // Exec cannot add restaurant in another exec's territory
            return NextResponse.json({ error: `Territory conflict: pincode ${insertData.pincode} belongs to territory "${(matchedTerritory as any).name}" assigned to another executive.`, territory: matchedTerritory, conflict: true }, { status: 409 });
          }
          // Admin adding: auto-inherit but warn in response
          if (!insertData.assigned_executive_id) {
            insertData.assigned_executive_id = territoryExec;
          }
        } else if (territoryExec && !insertData.assigned_executive_id) {
          // Same exec or admin: inherit territory's exec if not explicitly set
          insertData.assigned_executive_id = territoryExec;
        }
      }
    } else if (latitude && longitude) {
      // Fallback: point-in-territory via nearest territory center (approx) if pincode missing
      const { data: territories } = await supabaseAdmin.from("territories").select("id, city, assigned_executive_id, polygon_coords").not("polygon_coords", "is", null);
      if (territories && territories.length > 0) {
        let nearest: any = null;
        let minDist = Infinity;
        for (const t of territories as any[]) {
          const coords = t.polygon_coords;
          if (Array.isArray(coords) && coords[0]?.lat && coords[0]?.lng) {
            const dLat = latitude - coords[0].lat;
            const dLng = longitude - coords[0].lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);
            if (dist < minDist) {
              minDist = dist;
              nearest = t;
            }
          }
        }
        // If within ~5km (0.05 deg approx) assign to nearest
        if (nearest && minDist < 0.05) {
          insertData.territory_id = nearest.id;
          if (nearest.assigned_executive_id && !insertData.assigned_executive_id) {
            insertData.assigned_executive_id = nearest.assigned_executive_id;
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      restaurant: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}