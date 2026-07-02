import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { certificateId: string } }
) {
  const { data: cert, error } = await supabaseAdmin
    .from("academy_certificates")
    .select(
      `certificate_id,
       user_name,
       user_email,
       issued_at,
       score,
       verification_token`
    )
    .eq("certificate_id", params.certificateId)
    .single();

  if (error || !cert) {
    return NextResponse.json(
      { success: false, error: "Certificate not found" },
      { status: 404 }
    );
  }

  // OPTIONAL: Add auth check here if you want verification to be private.
  // const { data: { session } } = await supabaseAdmin.auth.getSession();
  // if (!session) {
  //   return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  // }

  return NextResponse.json({ success: true, certificate: cert });
}
