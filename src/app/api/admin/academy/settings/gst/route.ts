import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("admin_users").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["founder", "super_admin", "hr_admin"].includes(profile.role)) return null;
    return true;
  } catch {
    return null;
  }
}

const GST_KEYS = [
  "academy_gst_rate",
  "academy_gst_enabled",
  "academy_gst_inclusive",
  "academy_gst_tin_number",
  "academy_gst_company_name",
];

export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value, type")
      .in("key", GST_KEYS);

    if (error) throw error;

    const settings: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Failed to fetch GST settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const updates: Record<string, string> = body.settings || {};

    for (const [key, value] of Object.entries(updates)) {
      if (!GST_KEYS.includes(key)) continue;

      await supabaseAdmin
        .from("settings")
        .upsert(
          {
            key,
            value: String(value),
            type: "text",
            is_secret: false,
          },
          { onConflict: "key" }
        );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update GST settings" }, { status: 500 });
  }
}
