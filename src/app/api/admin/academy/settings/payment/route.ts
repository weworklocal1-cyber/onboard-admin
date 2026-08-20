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

const PAYMENT_KEYS = [
  "academy_payment_gateway",
  "academy_razorpay_key_id",
  "academy_razorpay_key_secret",
  "academy_razorpay_webhook_secret",
  "academy_payment_enabled",
  "academy_upi_id",
  "academy_upi_name",
  "academy_bank_account_holder",
  "academy_bank_account_number",
  "academy_bank_ifsc",
  "academy_bank_name",
];

export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value, type, is_secret")
      .in("key", PAYMENT_KEYS);

    if (error) throw error;

    const settings: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.is_secret ? "***" : row.value;
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Failed to fetch payment settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const updates: Record<string, string> = body.settings || {};

    for (const [key, value] of Object.entries(updates)) {
      if (!PAYMENT_KEYS.includes(key)) continue;

      const isSecret = key.includes("secret") || key.includes("key_secret");

      await supabaseAdmin
        .from("settings")
        .upsert(
          {
            key,
            value: String(value),
            type: isSecret ? "secret" : "text",
            is_secret: isSecret,
          },
          { onConflict: "key" }
        );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
  }
}
