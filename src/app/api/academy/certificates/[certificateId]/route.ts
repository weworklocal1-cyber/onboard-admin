import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { certificateId: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: admin } = await supabaseAdmin
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: certificate, error } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        certificate_id,
        score,
        issued_at,
        course:academy_courses!inner(title)
      `)
      .eq("certificate_id", params.certificateId)
      .single();

    if (error || !certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const course = (certificate as any).course;
    const courseTitle = Array.isArray(course) ? course[0]?.title : course?.title;

    return NextResponse.json({
      certificate: {
        certificate_id: certificate.certificate_id,
        score: certificate.score,
        issued_at: certificate.issued_at,
        course_title: courseTitle,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
