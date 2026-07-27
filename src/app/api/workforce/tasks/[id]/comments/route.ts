import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTaskEmail } from "@/app/api/workforce/tasks/email";

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

function canAccessTask(profile: { id: string; role: string }, task: { created_by: string; assigned_to: string }) {
  if (!task) return false;
  const isAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);
  if (isAdmin) return true;
  return task.created_by === profile.id || task.assigned_to === profile.id;
}

function extractMentions(content: string): string[] {
  const mentionRegex = /@([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

async function resolveMentionedUsers(fullNames: string[]): Promise<{ id: string; full_name: string; email: string }[]> {
  if (fullNames.length === 0) return [];
  
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("full_name", fullNames)
    .eq("status", "active");

  if (error) {
    console.error("Error resolving mentions:", error);
    return [];
  }

  return data || [];
}

// GET /api/workforce/tasks/[id]/comments
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
      .select("id, created_by, assigned_to")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: comments, error: commentsError } = await supabaseAdmin
      .from("task_comments")
      .select(`
        *,
        author:profiles!author_id(id, full_name, profile_picture_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      return NextResponse.json({ error: commentsError.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST /api/workforce/tasks/[id]/comments
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
    const body = await request.json();
    const { content, attachment_url } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, created_by, assigned_to, title")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(sessionUser, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: comment, error: commentError } = await supabaseAdmin
      .from("task_comments")
      .insert({
        task_id: taskId,
        author_id: sessionUser.id,
        content: content.trim(),
        attachment_url: attachment_url || null,
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, profile_picture_url)
      `)
      .single();

    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }

    // Handle @mentions
    const mentionedNames = extractMentions(content);
    if (mentionedNames.length > 0) {
      const mentionedUsers = await resolveMentionedUsers(mentionedNames);
      
      const notificationPromises = mentionedUsers
        .filter(user => user.id !== sessionUser.id)
        .map(user =>
          supabaseAdmin.from("notifications").insert({
            recipient_id: user.id,
            sender_id: sessionUser.id,
            type: "task_updated",
            title: "You were mentioned in a task comment",
            message: `${sessionUser.full_name} mentioned you in a comment on task "${task.title}"`,
            data: { 
              task_id: taskId, 
              comment_id: comment.id,
              comment_content: content.substring(0, 200),
            },
            read: false,
          })
        );

      await Promise.all(notificationPromises);

      // Send email to mentioned users
      const emailPromises = mentionedUsers
        .filter(user => user.id !== sessionUser.id && user.email)
        .map(user =>
          sendTaskEmail({
            to: user.email,
            subject: `You were mentioned in: ${task.title}`,
            taskTitle: task.title,
            taskId,
            recipientName: user.full_name,
            action: "completed",
          }).catch(err => console.error("Failed to send mention email:", err))
        );

      await Promise.all(emailPromises);
    }

    return NextResponse.json({ success: true, comment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
