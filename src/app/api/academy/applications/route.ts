import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("internship_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data || [] });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { full_name, email, phone, certificate_id, motivation, resume_url } = body as {
    full_name: string; email: string; phone?: string; certificate_id?: string; motivation?: string; resume_url?: string;
  };

  if (!full_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
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
      resume_url,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, application_id: data.id });
}
