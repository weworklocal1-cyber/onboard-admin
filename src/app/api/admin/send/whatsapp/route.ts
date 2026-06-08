import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message, phoneNumberId } = body as { to: string; message: string; phoneNumberId?: string };

    if (!to || !message) {
      return NextResponse.json({ error: "Missing fields: to, message" }, { status: 400 });
    }

    const token = process.env.WHATSAPP_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
    const phoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return NextResponse.json({
        error: "WhatsApp not configured",
        hint: "Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars",
        fallback: `https://wa.me/${to.replace("+", "").replace(/\s/g, "")}?text=${encodeURIComponent(message)}`,
      }, { status: 500 });
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("[send-whatsapp] error:", result);
      return NextResponse.json({ error: "WhatsApp send failed", details: result }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
