import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
    return profile;
  } catch {
    return null;
  }
}

function isFounderOrAdmin(role: string) {
  return ['founder', 'super_admin', 'hr_admin'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("pip_criteria_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ rules: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rule_name, description, metric_type, threshold_value, threshold_unit, comparison, window_days } = body;

    if (!rule_name || !metric_type || !threshold_value || !threshold_unit) {
      return NextResponse.json({ error: "rule_name, metric_type, threshold_value, and threshold_unit are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("pip_criteria_rules")
      .insert({
        rule_name,
        description: description || "",
        metric_type,
        threshold_value,
        threshold_unit,
        comparison: comparison || "less_than",
        window_days: window_days || 30,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create rule" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, is_active, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const updateData: any = { ...updates };
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active;
    }

    const { data, error } = await supabaseAdmin
      .from("pip_criteria_rules")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ rule: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !isFounderOrAdmin(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("pip_criteria_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Rule deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete rule" }, { status: 500 });
  }
}
