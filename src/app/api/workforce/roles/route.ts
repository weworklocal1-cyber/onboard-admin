import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id, name, label, description, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("label");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, label, description, is_active = true } = body;
    if (!name?.trim() || !label?.trim())
      return NextResponse.json({ error: "Name and label are required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("roles")
      .insert({ name: name.trim(), label: label.trim(), description: description?.trim() || null, is_active })
      .select("id, name, label, description, is_active, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
