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

    // Fraud prevention: check for duplicate visits within 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentVisits } = await supabaseAdmin
      .from("restaurant_interactions")
      .select("id, interacted_at")
      .eq("restaurant_id", restaurant_id)
      .eq("executive_id", sessionUser.id)
      .gte("interacted_at", thirtyMinAgo);

    if (recentVisits && recentVisits.length > 0) {
      return NextResponse.json({ error: "Duplicate visit detected within 30 minutes" }, { status: 400 });
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
        gps_verified: !!(lat && lng),
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