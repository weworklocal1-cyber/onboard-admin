import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin, canAccessRestaurantCRM } from "@/lib/permissions";

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

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const restaurant_id = searchParams.get("restaurant_id");

  if (!restaurant_id) {
    return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("restaurant_documents")
    .select("*")
    .eq("restaurant_id", restaurant_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userIsAdmin, canAccessCRM] = await Promise.all([
    isAdmin(sessionUser.role),
    canAccessRestaurantCRM(sessionUser.role),
  ]);
  if (!userIsAdmin && !canAccessCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const restaurant_id = formData.get("restaurant_id") as string;
    const document_type = formData.get("document_type") as string;
    const file = formData.get("file") as File;

    if (!restaurant_id || !document_type || !file) {
      return NextResponse.json({ error: "Restaurant ID, document type, and file required" }, { status: 400 });
    }

    const fileName = `${restaurant_id}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("restaurant-documents")
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("restaurant-documents").getPublicUrl(fileName);

    const { error: insertError } = await supabaseAdmin.from("restaurant_documents").insert({
      restaurant_id,
      document_type,
      file_url: urlData.publicUrl,
      file_name: file.name,
      uploaded_by: sessionUser.id,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}