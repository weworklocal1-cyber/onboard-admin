import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { RestaurantStatus } from "@/types/workforce";
import { canAccessRestaurantCRM } from "@/lib/permissions";
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

  const canEditRestaurants = await canAccessRestaurantCRM(sessionUser.role);
  if (!canEditRestaurants) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const restaurantId = url.pathname.split("/").pop();
    const body = await request.json();
    const { status, assigned_executive_id } = body as {
      status?: RestaurantStatus;
      assigned_executive_id?: string | null;
    };

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (assigned_executive_id !== undefined) updateData.assigned_executive_id = assigned_executive_id;

    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .update(updateData)
      .eq("id", restaurantId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log for status changes
    if (status) {
      await logAudit(
        "status_change",
        "restaurants",
        restaurantId,
        {},
        { status },
        sessionUser.id
      );
    }

    return NextResponse.json({
      success: true,
      restaurant: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}