import { supabaseAdmin } from "@/lib/supabase";

export async function logAudit(
  action: string,
  table_name: string,
  record_id: string,
  old_values?: Record<string, any>,
  new_values?: Record<string, any>,
  user_id?: string
) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    action,
    table_name,
    record_id,
    old_values: old_values || null,
    new_values: new_values || null,
    performed_by: user_id || null,
  });

  if (error) {
    console.error("Audit log failed:", error);
  }
}