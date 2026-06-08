import { NextResponse } from "next/server";
import { submitLead } from "@/lib/submit-lead";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await submitLead("contact_leads", body);
    return NextResponse.json({ success: true, message: "Submitted successfully", id: result.id });
  } catch (error: any) {
    console.error("[contact] submit error:", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
