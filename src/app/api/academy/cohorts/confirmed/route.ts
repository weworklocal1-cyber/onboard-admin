import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: admin } = await supabaseAdmin
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: cohort } = await supabaseAdmin
      .from("intern_cohorts")
      .select("*")
      .eq("name", "Confirmed Interns")
      .single();

    if (!cohort) {
      return NextResponse.json({ whatsappGroupLink: null, cohort: null });
    }

    return NextResponse.json({ whatsappGroupLink: cohort.whatsapp_group_link, cohort });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
