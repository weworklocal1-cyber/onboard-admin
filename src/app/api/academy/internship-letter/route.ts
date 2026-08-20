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

    const fullName = (user.user_metadata?.full_name as string) || (user as any).full_name || "";

    const { data: certData } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        certificate_id,
        score,
        issued_at,
        course:academy_courses!inner(title)
      `)
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    const certificates = (certData || []).map((c: any) => {
      const course = Array.isArray(c.course) ? c.course[0] : c.course;
      return {
        certificate_id: c.certificate_id,
        score: c.score || 0,
        issued_at: c.issued_at,
        course_title: course?.title || "Unknown",
      };
    });

    const hasValidCert = certificates.some((c: any) => c.score >= 68);

    const letterDate = "8 July 2026";
    const internStartDate = "8 July 2026";

    return NextResponse.json({
      userName: fullName,
      letterDate,
      internStartDate,
      certificates,
      hasValidCert,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
