import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type PreferencePayload = {
  type: string;
  enabled: boolean;
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: preferences } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("channel", "in_app");

    return NextResponse.json({ preferences: preferences || [] });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body as { preferences: PreferencePayload[] };

    if (!Array.isArray(preferences)) {
      return NextResponse.json({ error: "Invalid preferences payload" }, { status: 400 });
    }

    const upserted = await Promise.all(
      preferences.map((pref) =>
        supabaseAdmin
          .from("notification_preferences")
          .upsert(
            {
              user_id: user.id,
              channel: "in_app",
              type: pref.type,
              enabled: pref.enabled,
            },
            { onConflict: "user_id,channel,type" }
          )
          .select("*")
          .single()
      )
    );

    const results = upserted.map((r) => r.data).filter(Boolean);

    return NextResponse.json({ preferences: results });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
