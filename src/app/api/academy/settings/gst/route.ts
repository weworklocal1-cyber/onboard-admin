import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const GST_KEYS = [
  "academy_gst_rate",
  "academy_gst_enabled",
  "academy_gst_inclusive",
  "academy_gst_tin_number",
  "academy_gst_company_name",
];

export async function GET(request: Request) {
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
    return NextResponse.json({ settings: {} }, { status: 200 });
  }
}
