import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Public read for applicant table WhatsApp - no auth needed, only active templates
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "applicants";

  try {
    const { data, error } = await supabaseAdmin
      .from("message_templates")
      .select("id, key, name, category, channel, subject, body, tags, is_active")
      .eq("category", category)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ templates: data || [] });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
