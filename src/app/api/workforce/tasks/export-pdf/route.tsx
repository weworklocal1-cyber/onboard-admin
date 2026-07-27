import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Document, Page, View, Text, StyleSheet, renderToStream } from "@react-pdf/renderer";

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

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 10, color: "#333" },
  title: { fontSize: 18, fontWeight: "bold", color: "#FF6B35", marginBottom: 6 },
  meta: { fontSize: 9, color: "#666", marginBottom: 16 },
  task: { marginBottom: 14, padding: 12, border: "1 solid #e5e7eb", borderRadius: 6 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  taskTitle: { fontSize: 13, fontWeight: "bold", color: "#111", flex: 1 },
  taskMeta: { fontSize: 9, color: "#666", marginTop: 4 },
  badge: { padding: 2, borderRadius: 4, fontSize: 9, fontWeight: "bold", textTransform: "uppercase" },
  description: { marginTop: 8, padding: 6, backgroundColor: "#f9fafb", borderRadius: 4, fontSize: 10 },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    urgent: { bg: "#fee2e2", text: "#991b1b" },
    high: { bg: "#ffedd5", text: "#9a3412" },
    medium: { bg: "#fef3c7", text: "#92400e" },
    low: { bg: "#d1fae5", text: "#065f46" },
  };
  const c = colors[priority] || { bg: "#f3f4f6", text: "#374151" };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, color: c.text }]}>
      <Text>{priority}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    todo: { bg: "#f1f5f9", text: "#475569" },
    in_progress: { bg: "#dbeafe", text: "#1e40af" },
    in_review: { bg: "#e9d5ff", text: "#6b21a8" },
    completed: { bg: "#d1fae5", text: "#065f46" },
    approved: { bg: "#d1fae5", text: "#065f46" },
    blocked: { bg: "#fee2e2", text: "#991b1b" },
    rejected: { bg: "#fee2e2", text: "#991b1b" },
  };
  const c = colors[status] || { bg: "#f3f4f6", text: "#374151" };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, color: c.text }]}>
      <Text>{status.replace(/_/g, " ")}</Text>
    </View>
  );
}

function TaskItem({ task }: { task: any }) {
  const creatorName =
    Array.isArray(task.creator) && task.creator[0]?.full_name
      ? task.creator[0].full_name
      : typeof task.creator === "string"
        ? task.creator
        : task.creator?.full_name || "Unknown";

  const assignees =
    (task.assignees || [])
      .map((a: any) => {
        if (Array.isArray(a.employee) && a.employee[0]?.full_name) return a.employee[0].full_name;
        if (a.employee?.full_name) return a.employee.full_name;
        return null;
      })
      .filter(Boolean) as string[];

  return (
    <View style={styles.task} wrap>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{escapeHtml(task.title)}</Text>
        <View style={{ flexDirection: "row", gap: 4, marginLeft: 8 }}>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </View>
      </View>
      <Text style={styles.taskMeta}>
        {creatorName} | {task.due_date ? `Due: ${task.due_date}` : "No due date"}
        {task.estimated_hours ? ` | Est: ${task.estimated_hours}h` : ""}
        {task.actual_hours ? ` | Actual: ${task.actual_hours}h` : ""}
      </Text>
      {task.description ? <Text style={styles.description}>{escapeHtml(task.description)}</Text> : null}
      {assignees.length > 0 ? (
        <Text style={{ fontSize: 9, marginTop: 6 }}>
          Assignees: {assignees.map((n: string) => escapeHtml(n)).join(", ")}
        </Text>
      ) : null}
    </View>
  );
}

// GET /api/workforce/tasks/export-pdf
export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskIds = searchParams.get("ids")?.split(",").filter(Boolean);

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs are required" }, { status: 400 });
    }

    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        estimated_hours,
        actual_hours,
        created_at,
        department,
        creator:profiles!created_by(full_name),
        assignees:task_assignees(
          employee_id,
          status,
          employee:profiles!employee_id(full_name)
        )
      `)
      .in("id", taskIds);

    if (error) throw error;

    const taskList = tasks || [];

    const pdfBuffer = await new Promise<Buffer | null>(async (resolve) => {
      try {
        const stream = await renderToStream(
          <Document>
            <Page size="A4" style={styles.page}>
              <Text style={styles.title}>Tasks Export</Text>
              <Text style={styles.meta}>
                Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} | Total: {taskList.length} tasks
              </Text>
              {taskList.map((task: any) => (
                <TaskItem key={task.id} task={task} />
              ))}
              <Text style={styles.footer} fixed>
                LocalWala Workforce Hub | Exported on {new Date().toLocaleString()}
              </Text>
            </Page>
          </Document>
        );

        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(Buffer.from(chunk)));
        }
        const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
        resolve(buffer);
      } catch (err) {
        console.error("PDF generation failed:", err);
        resolve(null);
      }
    });

    if (!pdfBuffer) {
      return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
    }

    return new NextResponse(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tasks-export-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
