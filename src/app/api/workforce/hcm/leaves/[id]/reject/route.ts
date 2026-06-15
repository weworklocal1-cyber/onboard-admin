import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin, isHr } from "@/lib/permissions";

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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userIsAdmin, userIsHr] = await Promise.all([
    isAdmin(sessionUser.role),
    isHr(sessionUser.role),
  ]);
  if (!userIsAdmin && !userIsHr) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .update({
      status: "rejected",
      approved_by: sessionUser.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, leave: data });
}