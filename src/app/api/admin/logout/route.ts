import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("admin_users")
    .select("full_name")
    .eq("id", user.id)
    .single();
  return { id: user.id, full_name: profile?.full_name ?? null };
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ success: true });

    await supabaseAdmin.from("admin_activity_log").insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name,
      action: "logout",
      target_table: null,
      target_id: null,
      details: { logout_time: new Date().toISOString() },
    });

  return NextResponse.json({ success: true });
}
