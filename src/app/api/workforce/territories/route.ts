import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/permissions";

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

  // Allow founder/super_admin/hr_admin full access, or onboarding_executive view own territories
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseFloat(searchParams.get("radius") || "10");

  // Restaurant discovery mode (for map)
  if (lat && lng) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    let googleResults: any[] = [];
    
    // Try Google Places API first for real data
    if (apiKey) {
      try {
        const radiusMeters = Math.min(radius * 1000, 50000);
        // Request more fields including phone number
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
            review_count: place.user_ratings_total || 0,
            status: "new_lead",
            locality: place.vicinity || "",
            google_place_id: place.place_id,
          }));
        }
      } catch (e) {
        console.error("Google Places fetch error:", e);
      }
    }
    
    const { data: restaurants, error } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, latitude, longitude, status, avg_rating")
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

    // Return combined results (Google Places first for real data)
    const allRestaurants = [...googleResults, ...nearbyRestaurants];
    return NextResponse.json({ restaurants: allRestaurants });
  }

  // Territories listing mode
  let query = supabaseAdmin
    .from("territories")
    .select(`*, assigned_executive:profiles!assigned_executive_id(full_name)`);

  // Onboarding exec can only see territories assigned to them
  if (sessionUser.role === "onboarding_executive") {
    query = query.eq("assigned_executive_id", sessionUser.id);
  }

  const { data: territories, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: executives, error: execError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "onboarding_executive");

  if (execError) {
    return NextResponse.json({ error: execError.message }, { status: 500 });
  }

  return NextResponse.json({ territories, executives });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdmin(sessionUser.role))) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, city, pincodes, polygon_coords } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("territories")
      .insert({
        name,
        city: city || "Indore",
        pincodes: pincodes || [],
        polygon_coords: polygon_coords || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, territory: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}