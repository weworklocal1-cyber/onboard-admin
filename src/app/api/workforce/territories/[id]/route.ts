import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin, canAccessRestaurantCRM } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(sessionUser.role);
  const canCRM = await canAccessRestaurantCRM(sessionUser.role);
  if (!userIsAdmin && !canCRM) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const territoryId = pathParts[pathParts.length - 1];
    const body = await request.json();

    if (!territoryId) {
      return NextResponse.json({ error: "Territory ID required" }, { status: 400 });
    }

    // Fetch current for transfer logic
    const { data: current } = await supabaseAdmin.from("territories").select("assigned_executive_id").eq("id", territoryId).single();
    const currentExec = (current as any)?.assigned_executive_id || null;
    const newExec = body.assigned_executive_id ?? null;

    // If territory already assigned to different exec and requester is NOT admin, require approval via territory_transfers (PRD 18.3)
    if (currentExec && newExec && currentExec !== newExec && !userIsAdmin) {
      const { data: pending } = await supabaseAdmin.from("territory_transfers").insert({ territory_id: territoryId, from_executive_id: currentExec, to_executive_id: newExec, requested_by: sessionUser.id, status: "pending" }).select("*").single();
      await logAudit("territory_transfer_requested", "territories", territoryId, { from: currentExec }, { to: newExec }, sessionUser.id);
      return NextResponse.json({ success: true, pending: true, transfer: pending, message: "Transfer request created - pending HR/Founder approval" }, { status: 202 });
    }

    const { data, error } = await supabaseAdmin
      .from("territories")
      .update(body)
      .eq("id", territoryId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If executive assigned, bulk-link restaurants in that territory's pincodes
    // so onboarding_executive sees only assigned territory restaurants (RLS requires territory_id or pincode match)
    if (body.assigned_executive_id !== undefined) {
      const { data: terr } = await supabaseAdmin.from("territories").select("pincodes").eq("id", territoryId).single();
      const pincodes: string[] | null = (terr as any)?.pincodes || null;
      if (body.assigned_executive_id) {
        // Assign: set territory_id and assigned_executive_id for restaurants whose pincode in territory
        if (pincodes && pincodes.length > 0) {
          await supabaseAdmin.from("restaurants").update({ territory_id: territoryId, assigned_executive_id: body.assigned_executive_id }).in("pincode", pincodes);
        } else {
          // No pincodes defined: still set territory_id for unassigned restaurants in same city (fallback)
          // Skip if pincodes empty to avoid mass assign
        }
      } else {
        // Unassign: clear executive from restaurants in this territory (keep territory_id)
        if (pincodes && pincodes.length > 0) {
          await supabaseAdmin.from("restaurants").update({ assigned_executive_id: null }).eq("territory_id", territoryId);
          await supabaseAdmin.from("restaurants").update({ assigned_executive_id: null }).in("pincode", pincodes).is("territory_id", null);
        } else {
          await supabaseAdmin.from("restaurants").update({ assigned_executive_id: null }).eq("territory_id", territoryId);
        }
      }
    }

    await logAudit(
      "territory_update",
      "territories",
      territoryId,
      {},
      body,
      sessionUser.id
    );

    return NextResponse.json({ success: true, territory: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}