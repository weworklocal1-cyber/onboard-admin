import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAYMENT_KEYS = [
  "academy_payment_gateway",
  "academy_payment_enabled",
  "academy_upi_id",
  "academy_upi_name",
  "academy_bank_account_holder",
  "academy_bank_account_number",
  "academy_bank_ifsc",
  "academy_bank_name",
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", PAYMENT_KEYS);

    if (error) throw error;

    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: {} }, { status: 200 });
  }
}
