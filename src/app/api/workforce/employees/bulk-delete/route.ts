import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPermissionRules } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return profile;
}

function nullifyReferences(admin: typeof supabaseAdmin, userId: string) {
  return Promise.all([
    admin.from("internship_applications").update({ user_id: null }).eq("user_id", userId),
    admin.from("intern_cohort_members").update({ user_id: null }).eq("user_id", userId),
  ]);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await getPermissionRules();
  const allowedRoles = new Set(rules.ADMIN_ROLES || []);
  if (!allowedRoles.has(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const validIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);

    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
    }

    const results = {
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const id of validIds) {
      try {
        await nullifyReferences(supabaseAdmin, id);

        try {
          await supabaseAdmin.auth.admin.deleteUser(id);
        } catch (authErr) {
          console.error(`[bulk-delete] auth delete failed for ${id}:`, authErr);
        }

        const { error: deleteError } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", id);

        if (deleteError) {
          results.failed++;
          results.errors.push(`Failed to delete profile ${id}: ${deleteError.message}`);
        } else {
          results.deleted++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`Error deleting ${id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (results.deleted === 0 && results.failed > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No profiles deleted. ${results.failed} failed.`,
          results,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${results.deleted} profile${results.deleted !== 1 ? 's' : ''}`,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
