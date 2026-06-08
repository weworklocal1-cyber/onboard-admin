import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Fetch the user's role from admin_users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("admin_users")
      .select("full_name, role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Access denied. Contact your administrator." }, { status: 403 });
    }

    await supabaseAdmin.from("admin_activity_log").insert({
      user_id: data.user.id,
      user_name: profile.full_name,
      action: "login",
      target_table: null,
      target_id: null,
      details: { email: data.user.email, login_time: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      accessToken: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
