import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAcademyAuth } from "@/lib/academy-auth";
import { sendPaymentEmail } from "../email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAcademyAuth(request);

    const formData = await request.formData();
    const file = formData.get("screenshot") as File | null;
    const courseId = formData.get("course_id") as string | null;
    const upiId = formData.get("upi_id") as string | null;
    const transactionNote = formData.get("transaction_note") as string | null;

    if (!file || !courseId || !upiId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const fileName = `payment-proofs/${user.id}/${courseId}/${Date.now()}.jpg`;
    const contentType = file.type || "image/jpeg";

    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(fileName, Buffer.from(bytes), {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[proof-upload] upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload screenshot" }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("payment-proofs")
      .getPublicUrl(fileName);

    const proofUrl = publicUrlData?.publicUrl ?? null;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("academy_orders")
      .insert({
        user_id: user.id,
        course_id: courseId,
        amount: 0,
        currency: "INR",
        status: "pending_verification",
        payment_method: "upi_direct",
        upi_id: upiId,
        transaction_note: transactionNote,
        payment_proof_url: proofUrl,
        gateway_order_id: `direct_${Date.now()}`,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[proof-upload] order error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const { data: course } = await supabaseAdmin
      .from("academy_courses")
      .select("title")
      .eq("id", courseId)
      .maybeSingle();

    const { data: admins } = await supabaseAdmin
      .from("admin_users")
      .select("email, full_name")
      .in("role", ["founder", "super_admin", "hr_admin"]);

    const adminEmails = (admins || [])
      .map((admin) => admin.email)
      .filter((email): email is string => Boolean(email));

    if (adminEmails.length > 0) {
      await sendPaymentEmail({
        to: adminEmails.join(","),
        subject: `New Payment Proof Submitted - ${course?.title || "Course"}`,
        action: "proof_submitted",
        courseTitle: course?.title || "Unknown Course",
        orderId: order.id,
        proofUrl,
      });
    }

    return NextResponse.json({ success: true, orderId: order.id, proofUrl });
  } catch (e) {
    console.error("[proof-upload] error:", e);
    return NextResponse.json({ error: "Failed to upload payment proof" }, { status: 500 });
  }
}
