import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { renderToBuffer } from "@react-pdf/renderer";
import InternshipLetterPdf from "@/app/academy/internship-letter/letter-pdf";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: certData } = await supabaseAdmin
      .from("academy_certificates")
      .select("score")
      .eq("user_id", user.id);

    const hasValidCert = (certData || []).some((c: any) => (c.score || 0) >= 68);
    if (!hasValidCert) {
      return NextResponse.json({ error: "Certificate required" }, { status: 403 });
    }

    const fullName = (user.user_metadata?.full_name as string) || (user as any).full_name || "Intern";
    const today = new Date();
    const letterDate = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const internStartDate = nextMonth.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const pdfBuffer = await renderToBuffer(
      <InternshipLetterPdf
        userName={fullName}
        letterDate={letterDate}
        internStartDate={internStartDate}
      />
    );

    const filename = `internship-letter-${fullName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
