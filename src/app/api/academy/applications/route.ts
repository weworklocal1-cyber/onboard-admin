import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  
  let user = null;
  if (token) {
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!authError && authUser) {
      user = authUser;
    }
  }

  let query = supabaseAdmin
    .from("internship_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (user) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    const msg = error.message.toLowerCase();
    const statusCode = msg.includes('unauthorized') || msg.includes('forbidden') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status: statusCode });
  }
  return NextResponse.json({ applications: data || [] });
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { full_name, email, phone, certificate_id, motivation, resume_url } = body as {
      full_name: string; email: string; phone?: string; certificate_id?: string; motivation?: string; resume_url?: string;
    };

    // Ensure user profile exists (upsert) with required fields
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user.id, email: user.email ?? email, full_name });

    if (upsertError) {
      console.error('Failed to upsert profile:', upsertError);
      return NextResponse.json({ error: 'Failed to ensure user profile' }, { status: 500 });
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

    if (error) {
      const msg = error.message.toLowerCase();
      const statusCode = msg.includes('unauthorized') || msg.includes('forbidden') ? 401 : 500;
      console.error('POST /api/academy/applications error:', error);
      return NextResponse.json({ error: error.message }, { status: statusCode });
    }

    return NextResponse.json({ success: true, application_id: data.id });
  } catch (e: any) {
    console.error('Unexpected error in POST /api/academy/applications:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
