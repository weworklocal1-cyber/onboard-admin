import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { InteractionType } from "@/types/workforce";
import { isAdmin, canAccessRestaurantCRM } from "@/lib/permissions";

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

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userIsAdmin, canAccessCRM] = await Promise.all([
    isAdmin(sessionUser.role),
    canAccessRestaurantCRM(sessionUser.role),
  ]);
  if (!userIsAdmin && !canAccessCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      restaurant_id,
      interaction_type,
      outcome,
      notes,
      lat,
      lng,
      photo_urls,
      next_follow_up,
    } = body as {
      restaurant_id: string;
      interaction_type: InteractionType;
      outcome?: string;
      notes?: string;
      lat?: number;
      lng?: number;
      photo_urls?: string[];
      next_follow_up?: {
        scheduled_at: string;
        follow_up_type: string;
        notes?: string;
      };
    };

    if (!restaurant_id || !interaction_type) {
      return NextResponse.json({ error: "Restaurant ID and interaction type required" }, { status: 400 });
    }

    // Fetch restaurant coords for GPS verification (PRD 13.4: 200m radius)
    const { data: restaurant } = await supabaseAdmin.from("restaurants").select("latitude, longitude, territory_id, assigned_executive_id, pincode").eq("id", restaurant_id).single();
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Territory isolation: exec can only log visit for restaurants in his territory (unless admin)
    if (!userIsAdmin && sessionUser.role === "onboarding_executive") {
      const { data: myTerritories } = await supabaseAdmin.from("territories").select("id, pincodes").eq("assigned_executive_id", sessionUser.id);
      const allowedPincodes = new Set((myTerritories || []).flatMap((t: any) => t.pincodes || []));
      const allowedIds = new Set((myTerritories || []).map((t: any) => t.id));
      const rest = restaurant as any;
      const isAllowed = rest.assigned_executive_id === sessionUser.id || (rest.territory_id && allowedIds.has(rest.territory_id)) || (rest.pincode && allowedPincodes.has(rest.pincode));
      if (!isAllowed) {
        return NextResponse.json({ error: "Forbidden: restaurant not in your assigned territory" }, { status: 403 });
      }
    }

    // GPS verification: Haversine distance vs restaurant coords
    let gps_verified = false;
    let gps_distance_meters: number | null = null;
    if (lat && lng && (restaurant as any).latitude && (restaurant as any).longitude) {
      const toRad = (d: number) => d * Math.PI / 180;
      const R = 6371000; // meters
      const dLat = toRad(lat - Number((restaurant as any).latitude));
      const dLng = toRad(lng - Number((restaurant as any).longitude));
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(Number((restaurant as any).latitude))) * Math.cos(toRad(lat)) * Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = R * c;
      gps_distance_meters = Math.round(dist);
      gps_verified = dist <= 200; // PRD 13.4 configurable 200m
      if (!gps_verified && !userIsAdmin) {
        // Allow but mark unverified; require reason in notes for audit
        // If strict mode needed, uncomment next line to block:
        // return NextResponse.json({ error: `GPS verification failed: ${gps_distance_meters}m away (must be within 200m). Add reason in notes for exception.`, gps_distance_meters, gps_verified: false }, { status: 400 });
      }
    } else if (lat && lng) {
      // Restaurant has no coords: cannot verify, keep false but allow
      gps_verified = false;
    }

    // Fraud prevention: check for duplicate visits within 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentVisits } = await supabaseAdmin
      .from("restaurant_interactions")
      .select("id, interacted_at")
      .eq("restaurant_id", restaurant_id)
      .eq("executive_id", sessionUser.id)
      .gte("interacted_at", thirtyMinAgo);

    if (recentVisits && recentVisits.length > 0) {
      return NextResponse.json({ error: "Duplicate visit detected within 30 minutes", recentCount: recentVisits.length }, { status: 400 });
    }

    const { data: interaction, error: interactionError } = await supabaseAdmin
      .from("restaurant_interactions")
      .insert({
        restaurant_id,
        executive_id: sessionUser.id,
        interaction_type,
        outcome: outcome || null,
        notes: notes || null,
        visit_lat: lat || null,
        visit_lng: lng || null,
        gps_verified,
        gps_distance_meters,
        photo_urls: photo_urls || [],
      })
      .select("*")
      .single();

    if (interactionError) {
      return NextResponse.json({ error: interactionError.message }, { status: 500 });
    }

    if (next_follow_up) {
      await supabaseAdmin.from("follow_ups").insert({
        restaurant_id,
        assigned_to: sessionUser.id,
        follow_up_type: next_follow_up.follow_up_type,
        scheduled_at: next_follow_up.scheduled_at,
        notes: next_follow_up.notes,
      });
    }

    return NextResponse.json({
      success: true,
      interaction,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}