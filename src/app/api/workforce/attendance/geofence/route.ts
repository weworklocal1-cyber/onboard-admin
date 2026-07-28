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

function canManage(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");

  if (isNaN(lat) || isNaN(lng)) {
    const { data: geofences, error } = await supabaseAdmin
      .from("attendance_geofences")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ geofences: geofences || [] });
  }

  const { data: geofence, error } = await supabaseAdmin
    .from("attendance_geofences")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!geofence) {
    return NextResponse.json({ allowed: true, reason: "No geofence configured" });
  }

  const distance = haversineDistance(
    lat,
    lng,
    Number(geofence.latitude),
    Number(geofence.longitude)
  );

  const allowed = distance <= geofence.radius_meters;

  return NextResponse.json({
    allowed,
    distance: Math.round(distance),
    radius: geofence.radius_meters,
    geofence: { name: geofence.name, address: geofence.address },
    reason: allowed
      ? `Within ${geofence.name} (${Math.round(distance)}m from center)`
      : `Outside ${geofence.name} (${Math.round(distance)}m away, max ${geofence.radius_meters}m)`,
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, address, latitude, longitude, radius_meters, is_active } = body;

    if (!name || !latitude || !longitude) {
      return NextResponse.json({ error: "Name, latitude, and longitude are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("attendance_geofences")
      .insert({
        name,
        address: address || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius_meters: Number(radius_meters) || 200,
        is_active: is_active !== false,
        created_by: sessionUser.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ geofence: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create geofence" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, address, latitude, longitude, radius_meters, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Geofence ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address || null;
    if (latitude !== undefined) updateData.latitude = Number(latitude);
    if (longitude !== undefined) updateData.longitude = Number(longitude);
    if (radius_meters !== undefined) updateData.radius_meters = Number(radius_meters);
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from("attendance_geofences")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ geofence: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update geofence" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canManage(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Geofence ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("attendance_geofences")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Geofence deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete geofence" }, { status: 500 });
  }
}
