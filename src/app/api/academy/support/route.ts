import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body as { name: string; email: string; message: string };

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "LocalWala Academy <academy@localwala.tech>",
        to: "support@localwala.tech",
        subject: `New Support Message from ${name}`,
        html: `
          <div style="font-family: Inter, sans-serif; padding: 20px; color: #111827;">
            <h2 style="margin-bottom: 12px;">New Support Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f3f4f6; padding: 12px; border-radius: 8px; margin-top: 8px;">${message}</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
