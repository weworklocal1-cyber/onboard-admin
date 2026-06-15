import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from("department_roles")
    .select("id, role_id, created_at, role:roles(id, name, label, description, is_active)")
    .eq("department_id", params.id);

  if (error) {
    console.error("department_roles error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { role_id } = body;
    if (!role_id)
      return NextResponse.json({ error: "role_id is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("department_roles")
      .insert({ department_id: params.id, role_id })
      .select("id, department_id, role_id, created_at, role:roles(id, name, label, description, is_active)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
