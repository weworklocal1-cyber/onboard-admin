import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAdminUser(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("admin_users").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["founder", "super_admin", "hr_admin"].includes(profile.role)) return null;
    return true;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin.from("academy_courses").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: "Server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { title, description, difficulty, passing_score, is_published, slug, is_free, price, currency, instructor_name, what_you_will_learn, original_price, discounted_price, offer_duration_days } = body as any;
    if (!title || !slug) return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });

    const free = !!is_free;
    const normalizedPrice = free ? 0 : Math.max(0, Number(price) || 0);
    const normalizedCurrency = (free ? "INR" : (currency || "INR")).toUpperCase();
    const normalizedOriginalPrice = free ? 0 : Math.max(0, Number(original_price) || 0);
    const normalizedDiscountedPrice = free ? 0 : Math.max(0, Number(discounted_price) || 0);
    const normalizedOfferDuration = free ? 0 : Math.max(0, Number(offer_duration_days) || 0);

    if (!free && normalizedPrice <= 0) {
      return NextResponse.json({ error: "Paid courses must have a price greater than 0" }, { status: 400 });
    }

    if (!free && normalizedOriginalPrice > 0 && normalizedDiscountedPrice > 0 && normalizedDiscountedPrice >= normalizedOriginalPrice) {
      return NextResponse.json({ error: "Discounted price must be less than original price" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("academy_courses").insert([{
      title,
      description,
      slug,
      difficulty: difficulty || "beginner",
      passing_score: passing_score ?? 68,
      is_published: !!is_published,
      is_free: free,
      price: normalizedPrice,
      currency: normalizedCurrency,
      instructor_name: instructor_name || null,
      what_you_will_learn: Array.isArray(what_you_will_learn) ? what_you_will_learn : null,
      original_price: normalizedOriginalPrice,
      discounted_price: normalizedDiscountedPrice,
      offer_duration_days: normalizedOfferDuration,
    }]).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { id, title, description, difficulty, passing_score, is_published, slug, is_free, price, currency, instructor_name, what_you_will_learn, original_price, discounted_price, offer_duration_days } = body as any;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (passing_score !== undefined) updates.passing_score = passing_score;
    if (is_published !== undefined) updates.is_published = is_published;
    if (slug !== undefined) updates.slug = slug;
    if (is_free !== undefined) {
      updates.is_free = !!is_free;
      if (!!is_free) {
        updates.price = 0;
        updates.currency = "INR";
        updates.original_price = 0;
        updates.discounted_price = 0;
        updates.offer_duration_days = 0;
      }
    }
    if (price !== undefined && !updates.is_free) {
      updates.price = Math.max(0, Number(price) || 0);
    }
    if (currency !== undefined && !updates.is_free) {
      updates.currency = (currency || "INR").toUpperCase();
    }
    if (original_price !== undefined && !updates.is_free) {
      updates.original_price = Math.max(0, Number(original_price) || 0);
    }
    if (discounted_price !== undefined && !updates.is_free) {
      updates.discounted_price = Math.max(0, Number(discounted_price) || 0);
    }
    if (offer_duration_days !== undefined && !updates.is_free) {
      updates.offer_duration_days = Math.max(0, Number(offer_duration_days) || 0);
    }
    if (instructor_name !== undefined) updates.instructor_name = instructor_name || null;
    if (what_you_will_learn !== undefined) updates.what_you_will_learn = Array.isArray(what_you_will_learn) ? what_you_will_learn : null;
    const { data, error } = await supabaseAdmin.from("academy_courses").update(updates).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const text = await request.text();
    let id = "";
    if (text) {
      try { const body = JSON.parse(text); id = body.id || ""; } catch {}
    }
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: modules } = await supabaseAdmin.from("academy_modules").select("id").eq("course_id", id);
    const moduleIds = (modules || []).map((m: any) => m.id);

    if (moduleIds.length > 0) {
      const { data: quizzes } = await supabaseAdmin.from("academy_quizzes").select("id").in("module_id", moduleIds);
      const quizIds = (quizzes || []).map((q: any) => q.id);

      if (quizIds.length > 0) {
        const { data: attempts } = await supabaseAdmin.from("academy_attempts").select("id").in("quiz_id", quizIds);
        const attemptIds = (attempts || []).map((a: any) => a.id);
        if (attemptIds.length > 0) {
          await supabaseAdmin.from("academy_answers").delete().in("attempt_id", attemptIds);
          await supabaseAdmin.from("academy_attempts").delete().in("id", attemptIds);
        }
        await supabaseAdmin.from("academy_questions").delete().in("quiz_id", quizIds);
        await supabaseAdmin.from("academy_quizzes").delete().in("id", quizIds);
      }

      const { data: lessons } = await supabaseAdmin.from("academy_lessons").select("id").in("module_id", moduleIds);
      const lessonIds = (lessons || []).map((l: any) => l.id);
      if (lessonIds.length > 0) {
        await supabaseAdmin.from("academy_progress").delete().in("lesson_id", lessonIds);
      }
      await supabaseAdmin.from("academy_lessons").delete().in("module_id", moduleIds);
      await supabaseAdmin.from("academy_modules").delete().eq("course_id", id);
    }

    await supabaseAdmin.from("academy_enrollments").delete().eq("course_id", id);
    await supabaseAdmin.from("academy_certificates").delete().eq("course_id", id);

    const { error } = await supabaseAdmin.from("academy_courses").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
