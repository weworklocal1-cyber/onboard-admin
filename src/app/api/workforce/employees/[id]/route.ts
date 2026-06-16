import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

const ADMIN_ROLES = ["founder", "super_admin", "hr_admin"];

// GET /api/workforce/employees/[id]
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Employees can only view their own profile; admins can view any
  if (!ADMIN_ROLES.includes(sessionUser.role) && sessionUser.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ employee: data });
}

// PATCH /api/workforce/employees/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(sessionUser.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const {
    full_name, phone, designation, role, department,
    employment_type, status, joining_date, work_location,
    emergency_contact, reporting_manager_id,
  } = body;

  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name?.trim();
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (designation !== undefined) updates.designation = designation?.trim() || null;
  if (role !== undefined) updates.role = role;
  if (department !== undefined) updates.department = department || null;
  if (employment_type !== undefined) updates.employment_type = employment_type;
  if (status !== undefined) updates.status = status;
  if (joining_date !== undefined) updates.joining_date = joining_date || null;
  if (work_location !== undefined) updates.work_location = work_location?.trim() || null;
  if (emergency_contact !== undefined) updates.emergency_contact = emergency_contact?.trim() || null;
  if (reporting_manager_id !== undefined) updates.reporting_manager_id = reporting_manager_id || null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employee: data });
}

// DELETE /api/workforce/employees/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(sessionUser.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Prevent self-deletion
  if (sessionUser.id === params.id)
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  // Soft delete: mark as inactive
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", params.id);

  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Also disable auth user
  try {
    await supabaseAdmin.auth.admin.updateUserById(params.id, { ban_duration: "876600h" });
  } catch {
    // non-fatal, profile is already inactive
  }

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
