import { supabaseAdmin } from "@/lib/supabase";
import { UserRole } from "@/types/workforce";

let cached: Record<string, string[]> | null = null;

export async function getPermissionRules() {
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from("permission_rules")
    .select("group_name, role_names");

  if (error || !data) {
    return {};
  }

  const map: Record<string, string[]> = {};
  data.forEach((rule) => {
    map[rule.group_name] = rule.role_names;
  });

  cached = map;
  return map;
}

export async function isAdmin(role: UserRole): Promise<boolean> {
  const rules = await getPermissionRules();
  return (rules.ADMIN_ROLES || []).includes(role);
}

export async function isLeadOrAbove(role: UserRole): Promise<boolean> {
  const rules = await getPermissionRules();
  return (rules.LEAD_AND_ABOVE || []).includes(role);
}

export async function isHr(role: UserRole): Promise<boolean> {
  const rules = await getPermissionRules();
  return (rules.HR_ROLES || []).includes(role);
}

export async function canAccessRestaurantCRM(role: UserRole): Promise<boolean> {
  const rules = await getPermissionRules();
  return (rules.CAN_MANAGE_RESTAURANTS || []).includes(role);
}

export async function canManageMarketing(role: UserRole): Promise<boolean> {
  const rules = await getPermissionRules();
  return (rules.CAN_MANAGE_CAMPAIGNS || []).includes(role);
}
