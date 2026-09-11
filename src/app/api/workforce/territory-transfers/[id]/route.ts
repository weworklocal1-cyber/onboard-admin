import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.role))) return NextResponse.json({ error: "Forbidden - Admin required" }, { status: 403 });
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  const body = await request.json();
  const { action, reason } = body as { action: "approve" | "reject"; reason?: string };
  if (!id || !["approve","reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { data: transfer } = await supabaseAdmin.from("territory_transfers").select("*").eq("id", id).single();
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((transfer as any).status !== "pending") return NextResponse.json({ error: "Already decided" }, { status: 400 });
  if (action === "approve") {
    await supabaseAdmin.from("territories").update({ assigned_executive_id: (transfer as any).to_executive_id }).eq("id", (transfer as any).territory_id);
    // bulk re-link restaurants as in territories [id] PATCH
    const { data: terr } = await supabaseAdmin.from("territories").select("pincodes").eq("id", (transfer as any).territory_id).single();
    const pincodes = (terr as any)?.pincodes || [];
    if (pincodes.length > 0) {
      await supabaseAdmin.from("restaurants").update({ territory_id: (transfer as any).territory_id, assigned_executive_id: (transfer as any).to_executive_id }).in("pincode", pincodes);
    }
    await supabaseAdmin.from("territory_transfers").update({ status: "approved", decided_by: user.id, decided_at: new Date().toISOString(), reason: reason || (transfer as any).reason }).eq("id", id);
    await logAudit("territory_transfer_approved", "territories", (transfer as any).territory_id, { from: (transfer as any).from_executive_id }, { to: (transfer as any).to_executive_id }, user.id);
    return NextResponse.json({ success: true });
  } else {
    await supabaseAdmin.from("territory_transfers").update({ status: "rejected", decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", id);
    await logAudit("territory_transfer_rejected", "territories", (transfer as any).territory_id, {}, { reason }, user.id);
    return NextResponse.json({ success: true });
  }
}
