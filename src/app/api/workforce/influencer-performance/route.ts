import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin, canManageMarketing } from "@/lib/permissions";

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

  const [userIsAdmin, canManageCampaigns] = await Promise.all([
    isAdmin(sessionUser.role),
    canManageMarketing(sessionUser.role),
  ]);
  if (!userIsAdmin && !canManageCampaigns) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      influencer_id,
      campaign_id,
      content_url,
      platform,
      views,
      likes,
      shares,
      saves,
      comments,
      followers_gained,
    } = body as {
      influencer_id: string;
      campaign_id: string;
      content_url?: string;
      platform?: string;
      views?: number;
      likes?: number;
      shares?: number;
      saves?: number;
      comments?: number;
      followers_gained?: number;
    };

    if (!influencer_id || !campaign_id) {
      return NextResponse.json({ error: "Influencer ID and Campaign ID required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("influencer_performance")
      .insert({
        influencer_id,
        campaign_id,
        content_url,
        platform: platform || "instagram",
        views: views || 0,
        likes: likes || 0,
        shares: shares || 0,
        saves: saves || 0,
        comments: comments || 0,
        followers_gained: followers_gained || 0,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      performance: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}