import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Helper: verify session token and get user + role
async function getSessionUser(request: Request): Promise<{ id: string; email: string | undefined; full_name: string; role: string } | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseAdmin
    .from("admin_users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { id: user.id, email: user.email, full_name: profile.full_name, role: profile.role };
}

// Helper: log an admin action
async function logActivity(userId: string, userName: string, action: string, targetTable: string, targetId: string, details: object) {
  try {
    const { error } = await supabaseAdmin.from("admin_activity_log").insert({
      user_id: userId,
      user_name: userName,
      action,
      target_table: targetTable,
      target_id: targetId,
      details,
    });
    if (error) console.error("[activity-log] insert failed:", error.message);
  } catch (err) {
    console.error("[activity-log] unexpected error:", err);
  }
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tableParam = searchParams.get("table") || "all";
  const filter = searchParams.get("filter") || "all";

  // Special case: fetch activity log
  if (tableParam === "activity_log") {
    if (sessionUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data, error } = await supabaseAdmin
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [], count: data?.length ?? 0 });
  }

  let dateFilter: { gte?: string } = {};
  if (filter === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    dateFilter = { gte: start.toISOString() };
  } else if (filter === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    dateFilter = { gte: d.toISOString() };
  } else if (filter === "month") {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    dateFilter = { gte: d.toISOString() };
  } else if (filter === "year") {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1);
    dateFilter = { gte: d.toISOString() };
  }

  const tables = ["restaurant_partners", "delivery_partners", "careers", "contact_leads"];
  const targetTables = tableParam !== "all" && tables.includes(tableParam) ? [tableParam] : tables;

  const results: Record<string, unknown>[] = [];

  for (const t of targetTables) {
    let query = supabaseAdmin.from(t).select("*").order("timestamp", { ascending: false });
    if (dateFilter.gte) query = query.gte("timestamp", dateFilter.gte);
    const { data, error } = await query;
    if (error) { console.error(`[admin-api] ${t} error:`, error); continue; }
    if (!data) continue;

    for (const row of data) {
      const ts = row.timestamp ? new Date(row.timestamp) : null;
      const dateStr = ts ? ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      results.push({
        id: row.id, table: t, status: row.status ?? "new", date: dateStr,
        rawTimestamp: row.timestamp, ...row,
        name: row.owner_name ?? row.full_name ?? row.name ?? "—",
        mobile: row.mobile ?? "—", email: row.email ?? "—",
        state: row.state ?? "—", city: row.city ?? "—",
      });
    }
  }

  results.sort((a, b) => {
    const ta = a.rawTimestamp ? new Date(a.rawTimestamp as string).getTime() : 0;
    const tb = b.rawTimestamp ? new Date(b.rawTimestamp as string).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(_request: Request) {
  return NextResponse.json({ error: "Not allowed" }, { status: 405 });
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "super_admin") return NextResponse.json({ error: "Forbidden — super_admin only" }, { status: 403 });

  try {
    const body = await request.json();
    const { table, id } = body as { table: string; id: string };
    const allowed = ["restaurant_partners", "delivery_partners", "careers", "contact_leads"];
    if (!allowed.includes(table) || !id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) {
      console.error(`[admin-api] delete ${table} error:`, error);
      return NextResponse.json({ error: "Delete failed", details: error.message }, { status: 500 });
    }
    await logActivity(sessionUser.id, sessionUser.full_name, "delete_lead", table, id, { lead_id: id, table });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role === "viewer") return NextResponse.json({ error: "Forbidden — viewers cannot update leads" }, { status: 403 });

  try {
    const body = await request.json();
    const { table, id, status, rejection_reason } = body as {
      table: string; id: string; status: string; rejection_reason?: string | null;
    };
    const allowed = ["restaurant_partners", "delivery_partners", "careers", "contact_leads"];
    const allowedStatuses = ["new", "contacted", "qualified", "converted", "closed", "rejected"];
    if (!allowed.includes(table) || !id || !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Fetch old status for the activity log
    const { data: existing } = await supabaseAdmin.from(table).select("status").eq("id", id).single();

    const updateData: Record<string, string | null> = { status };
    if (rejection_reason !== undefined) updateData.rejection_reason = rejection_reason;

    const { error } = await supabaseAdmin.from(table).update(updateData).eq("id", id);
    if (error) {
      console.error(`[admin-api] patch ${table} error:`, error);
      return NextResponse.json({ error: "Update failed", details: error.message }, { status: 500 });
    }

    await logActivity(sessionUser.id, sessionUser.full_name, "status_change", table, id, {
      from: existing?.status ?? "unknown",
      to: status,
      rejection_reason: rejection_reason ?? null,
      lead_id: id,
      table,
    });

    return NextResponse.json({ success: true, status, rejection_reason });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
