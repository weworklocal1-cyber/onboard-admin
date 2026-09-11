import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  return profile as any;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const q = supabaseAdmin.from("territory_transfers").select("*, territory:territories(name, city), from:profiles!territory_transfers_from_executive_id_fkey(full_name), to:profiles!territory_transfers_to_executive_id_fkey(full_name), requester:profiles!territory_transfers_requested_by_fkey(full_name)").eq("status", status).order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transfers: data || [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { territory_id, to_executive_id, reason } = body;
  if (!territory_id || !to_executive_id) return NextResponse.json({ error: "territory_id and to_executive_id required" }, { status: 400 });
  const { data: territory } = await supabaseAdmin.from("territories").select("id, assigned_executive_id").eq("id", territory_id).single();
  if (!territory) return NextResponse.json({ error: "Territory not found" }, { status: 404 });
  const fromId = (territory as any).assigned_executive_id || null;
  // If unassigned, allow direct assign without transfer (founder/HR already handles via PATCH)
  // Otherwise create pending transfer
  const userIsAdmin = await isAdmin(user.role);
  if (!fromId || userIsAdmin) {
    // Founder/HR can directly assign - but we still log as transfer for audit if fromId exists
    if (fromId && fromId !== to_executive_id) {
      const { data, error } = await supabaseAdmin.from("territory_transfers").insert({ territory_id, from_executive_id: fromId, to_executive_id, requested_by: user.id, reason, status: "approved", decided_by: user.id, decided_at: new Date().toISOString() }).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from("territories").update({ assigned_executive_id: to_executive_id }).eq("id", territory_id);
      return NextResponse.json({ success: true, transfer: data, direct: true });
    }
    return NextResponse.json({ error: "No transfer needed - use PATCH directly for unassigned territories" }, { status: 400 });
  }
  // Non-admin (team_lead) request -> pending
  const { data, error } = await supabaseAdmin.from("territory_transfers").insert({ territory_id, from_executive_id: fromId, to_executive_id, requested_by: user.id, reason, status: "pending" }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, transfer: data, pending: true });
}
