import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

function canWrite(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

const ASSET_TYPES = [
  'laptop',
  'phone',
  'tablet',
  'camera',
  'vehicle',
  'furniture',
  'equipment',
  'other',
];

const CONDITION_STATUSES = ['excellent', 'good', 'fair', 'poor'];

// GET /api/workforce/assets
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = canWrite(sessionUser.role);

  let query = supabaseAdmin
    .from("assets")
    .select(`*, assignee:profiles!assets_assigned_to_fkey(id, full_name, department, designation)`)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("assigned_to", sessionUser.id).or("status,eq.available,status,eq.assigned");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data || [] });
}

// POST /api/workforce/assets
export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      asset_type,
      description,
      serial_number,
      purchase_date,
      purchase_price,
      current_value,
      condition_status,
      assigned_to,
      location,
      status,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .insert({
        name: name.trim(),
        asset_type: asset_type || "other",
        description: description?.trim() || null,
        serial_number: serial_number?.trim() || null,
        purchase_date: purchase_date || null,
        purchase_price: purchase_price ? Number(purchase_price) : null,
        current_value: current_value ? Number(current_value) : null,
        condition_status: condition_status || "good",
        assigned_to: assigned_to || null,
        assigned_at: assigned_to ? new Date().toISOString() : null,
        location: location?.trim() || null,
        status: status || (assigned_to ? "assigned" : "available"),
      })
      .select(`*, assignee:profiles!assets_assigned_to_fkey(id, full_name, department, designation)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
