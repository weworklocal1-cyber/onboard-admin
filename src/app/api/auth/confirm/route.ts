import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, email } = body as { user_id?: string; email?: string };

    if (!user_id && !email) {
      return NextResponse.json({ error: "user_id or email required" }, { status: 400 });
    }

    let targetId = user_id;

    if (!targetId && email) {
      const { data } = await supabaseAdmin.auth.admin.listUsers();
      const found = data?.users?.find((u) => u.email === email);
      targetId = found?.id;
    }

    if (!targetId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
