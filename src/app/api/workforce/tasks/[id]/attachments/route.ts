import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isLeadOrAbove } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return profile;
}

function getTaskAccess(profile: { id: string; role: string }, task: any): boolean {
  if (!task) return false;
  const isAdmin = ['founder', 'super_admin', 'hr_admin'].includes(profile.role);
  const isLead = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);
  if (isAdmin || isLead) return true;
  return task.created_by === profile.id || task.assigned_to === profile.id;
}

// POST /api/workforce/tasks/[id]/attachments
// Uploads a file attachment to a task
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;
    
    // Verify task exists and user has access
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to, attachment_urls")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!getTaskAccess(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 });
    }

    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from("task_attachments")
      .upload(fileName, file, {
        contentType: file.type,
        metadata: {
          task_id: taskId,
          uploaded_by: sessionUser.id,
          original_name: file.name,
        },
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get public URL (signed URL for private bucket)
    const { data: urlData } = supabaseAdmin
      .storage
      .from("task_attachments")
      .getPublicUrl(uploadData.path);

    // Update task's attachment_urls array
    const currentUrls = (task.attachment_urls as string[]) || [];
    const newUrls = [...currentUrls, urlData.publicUrl];

    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({ attachment_urls: newUrls })
      .eq("id", taskId);

    if (updateError) {
      // Rollback: delete uploaded file
      await supabaseAdmin.storage.from("task_attachments").remove([uploadData.path]);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attachment: {
        id: uploadData.path,
        url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET /api/workforce/tasks/[id]/attachments
// Lists all attachments for a task
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;
    
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("attachment_urls, created_by, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!getTaskAccess(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const urls = (task.attachment_urls as string[]) || [];

    return NextResponse.json({
      attachments: urls.map((url, index) => ({
        id: `${taskId}_${index}`,
        url,
        file_name: url.split("/").pop() || `Attachment ${index + 1}`,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/workforce/tasks/[id]/attachments/[attachmentId]
// Deletes an attachment from a task
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.id;
    const attachmentId = params.attachmentId;
    
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("attachment_urls, created_by, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!getTaskAccess(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const urls = (task.attachment_urls as string[]) || [];
    const urlToDelete = urls[parseInt(attachmentId.split("_")[1])];
    
    if (!urlToDelete) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Extract file path from URL
    const filePath = urlToDelete.split("/task_attachments/")[1]?.split("?")[0];
    if (filePath) {
      await supabaseAdmin.storage.from("task_attachments").remove([filePath]);
    }

    // Update task's attachment_urls
    const newUrls = urls.filter((url) => url !== urlToDelete);
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({ attachment_urls: newUrls })
      .eq("id", taskId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
