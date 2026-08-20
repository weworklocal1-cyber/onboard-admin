import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: certificates, error } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        id,
        certificate_id,
        course:academy_courses!inner(title),
        issued_at,
        score
      `)
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (certificates || []).map((cert: any) => {
      const course = Array.isArray(cert.course) ? cert.course[0] : cert.course;
      return {
        id: cert.id,
        certificateId: cert.certificate_id,
        courseTitle: course?.title || '',
        issuedAt: cert.issued_at,
        score: cert.score,
      };
    });

    return NextResponse.json({ certificates: result });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
