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
        
        // Save to database
        for (const place of googleData.results) {
          const name = place.name;
          const placeId = place.place_id;
          const plat = place.geometry?.location?.lat;
          const plng = place.geometry?.location?.lng;
          const rating = place.rating || 0;
          const reviewCount = place.user_ratings_total || 0;
          const address = place.vicinity || "";
          
          if (!placeId) continue;
          
          const { data: existing } = await supabaseAdmin
            .from("restaurants")
            .select("id")
            .eq("google_place_id", placeId)
            .maybeSingle();
            
          if (!existing) {
            await supabaseAdmin
              .from("restaurants")
              .insert({
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
              });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching/saving Google Places:", e);
    }
  }

  if (!lat || !lng) {
    if (pincodesParam) {
      const pincodes = pincodesParam.split(",").map(p => p.trim()).filter(Boolean);
      const { data: restaurants, error } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, latitude, longitude, status, avg_rating, locality, pincode, city")
        .in("pincode", pincodes)
        .limit(5);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ restaurants: restaurants || [] });
    }

    if (cityParam) {
      const { data: restaurants, error } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, latitude, longitude, status, avg_rating, locality, pincode, city")
        .eq("city", cityParam)
        .limit(5);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ restaurants: restaurants || [] });
    }

    // Fallback: if no DB results, use Google results
    if (googleResults.length > 0) {
      return NextResponse.json({ restaurants: googleResults });
    }

    return NextResponse.json({ error: "lat/lng or pincodes or city parameter required" }, { status: 400 });
  }

  const { data: restaurants, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, latitude, longitude, status, avg_rating, locality, pincode, city")
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

  // If we have Google results but no DB results, return Google results
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