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

    const { data: applications, error } = await supabaseAdmin
      .from("internship_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: applications || [] });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, email, phone, certificate_id, motivation } = body as {
      full_name: string;
      email: string;
      phone?: string;
      certificate_id?: string;
      motivation?: string;
    };

    if (!full_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
    }

    if (!certificate_id) {
      return NextResponse.json({ error: "Please select a certificate" }, { status: 400 });
    }

    const { data: existingApp } = await supabaseAdmin
      .from("internship_applications")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingApp) {
      return NextResponse.json({ error: "You have already applied for this internship" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("internship_applications")
      .insert({
        user_id: user.id,
        full_name,
        email,
        phone,
        certificate_id,
        motivation,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, application_id: data.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
