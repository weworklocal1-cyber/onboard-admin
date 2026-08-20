import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const certificateId = url.searchParams.get("certificateId");
    if (!certificateId) {
      return NextResponse.json({ error: "Missing certificateId parameter" }, { status: 400 });
    }

    const { data: certificate } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        *,
        course:academy_courses!inner(title),
        user:users!inner(full_name, email)
      `)
      .eq("certificate_id", certificateId)
      .single();

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const course = Array.isArray(certificate.course) ? certificate.course[0] : certificate.course;
    const user = Array.isArray(certificate.user) ? certificate.user[0] : certificate.user;

    return NextResponse.json({
      valid: true,
      certificateId: certificate.certificate_id,
      studentName: user?.full_name || "Unknown",
      studentEmail: user?.email || "",
      courseTitle: course?.title || "Unknown Course",
      score: certificate.score || 0,
      issuedAt: certificate.issued_at,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
