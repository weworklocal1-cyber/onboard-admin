import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const [{ data: roles }, { data: departments }, { data: employmentTypes }, { data: permissionRules }] = await Promise.all([
    supabaseAdmin.from("roles").select("*").order("label"),
    supabaseAdmin.from("departments").select("*").order("name"),
    supabaseAdmin.from("employment_types").select("*").order("label"),
    supabaseAdmin.from("permission_rules").select("*"),
  ]);

  const rulesByName: Record<string, string[]> = {};
  (permissionRules || []).forEach((rule: any) => {
    rulesByName[rule.group_name] = rule.role_names;
  });

  const permissions = {
    ADMIN_ROLES: rulesByName.ADMIN_ROLES || [],
    LEAD_AND_ABOVE: rulesByName.LEAD_AND_ABOVE || [],
    CAN_MANAGE_RESTAURANTS: rulesByName.CAN_MANAGE_RESTAURANTS || [],
    CAN_MANAGE_CAMPAIGNS: rulesByName.CAN_MANAGE_CAMPAIGNS || [],
    HR_ROLES: rulesByName.HR_ROLES || [],
  };

  return NextResponse.json({
    roles: roles || [],
    departments: departments || [],
    employmentTypes: employmentTypes || [],
    permissions,
  });
}
