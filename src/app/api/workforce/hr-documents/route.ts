import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).single();
  return profile;
}

function canRead(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead', 'employee'].includes(role);
}

function canWrite(role: string) {
  return ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(role);
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canRead(sessionUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin
    .from("hr_documents")
    .select(`id, employee_id, document_type, file_url, file_name, uploaded_by, created_at, employee:profiles!employee_id(full_name), uploader:profiles!uploaded_by(full_name)`)
    .order("created_at", { ascending: false });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  } else if (!canWrite(sessionUser.role)) {
    query = query.eq("employee_id", sessionUser.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || !canWrite(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const employeeId = formData.get("employee_id") as string;
    const documentType = formData.get("document_type") as string;
    const file = formData.get("file") as File;

    if (!employeeId || !documentType || !file) {
      return NextResponse.json({ error: "Employee ID, document type, and file are required" }, { status: 400 });
    }

    const fileName = `${employeeId}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("hr_documents")
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("hr_documents").getPublicUrl(fileName);

    const { error: insertError } = await supabaseAdmin.from("hr_documents").insert({
      employee_id: employeeId,
      document_type: documentType,
      file_url: urlData.publicUrl,
      file_name: file.name,
      uploaded_by: sessionUser.id,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
