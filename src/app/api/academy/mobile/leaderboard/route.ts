import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const { data: allXp } = await supabaseAdmin
      .from("academy_xp")
      .select("user_id, points, user_name")
      .order("points", { ascending: false })
      .limit(limit);

    const leaderboard = (allXp || []).map((entry: any, index: number) => ({
      rank: index + 1,
      full_name: entry.user_name || "Unknown",
      points: entry.points || 0,
    }));

    const { data: myXp } = await supabaseAdmin
      .from("academy_xp")
      .select("points, user_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const myRank = myXp
      ? (allXp || []).findIndex((e: any) => e.user_id === user.id) + 1
      : null;

    return NextResponse.json({
      leaderboard,
      myRank,
      myPoints: myXp?.points || 0,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
