import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

async function seed() {
  console.log("[seed] Starting with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));
  console.log("[seed] Has service key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Check Supabase connection
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return NextResponse.json({ 
      ok: false, 
      error: "Missing Supabase config", 
      url: url?.substring(0, 30) + "...",
      hasKey: !!key 
    }, { status: 500 });
  }

  try {
    // Seed departments
    console.log("[seed] Inserting departments...");
    const { error: deptErr } = await supabaseAdmin
      .from("departments")
      .upsert(
        [
          { name: "leadership", description: "Executive and leadership team" },
          { name: "engineering", description: "Product and software development" },
          { name: "marketing", description: "Marketing, branding, and growth" },
          { name: "operations", description: "Operations and delivery management" },
          { name: "hr", description: "Human resources and people operations" },
          { name: "sales", description: "Sales and business development" },
          { name: "support", description: "Customer support and success" },
          { name: "finance", description: "Finance and accounting" },
          { name: "field", description: "Field operations and on-ground teams" },
        ],
        { onConflict: "name" }
      );

    console.log("[seed] Departments result:", deptErr?.message || "success");
    if (deptErr) return NextResponse.json({ ok: false, step: "departments", error: deptErr.message }, { status: 500 });

    // Seed roles
    const { error: roleErr } = await supabaseAdmin
      .from("roles")
      .upsert([
        { name: "founder", label: "Founder", description: "Company founder with full access" },
        { name: "super_admin", label: "Super Admin", description: "Platform administrator with full access" },
        { name: "hr_admin", label: "HR Admin", description: "Human resources administrator" },
        { name: "team_lead", label: "Team Lead", description: "Department team lead" },
        { name: "employee", label: "Employee", description: "General employee" },
        { name: "developer", label: "Developer", description: "Software developer" },
        { name: "support_executive", label: "Support Executive", description: "Customer support executive" },
        { name: "marketing_executive", label: "Marketing Executive", description: "Marketing team member" },
        { name: "influencer", label: "Influencer", description: "Brand influencer/ambassador" },
        { name: "onboarding_executive", label: "Onboarding Executive", description: "Restaurant onboarding executive" },
        { name: "intern", label: "Intern", description: "Intern" },
        { name: "freelancer", label: "Freelancer", description: "Freelancer/contractor" },
      ], { onConflict: "name" });

    if (roleErr) return NextResponse.json({ ok: false, step: "roles", error: roleErr.message }, { status: 500 });

    // Seed employment types
    const { error: empErr } = await supabaseAdmin
      .from("employment_types")
      .upsert([
        { name: "full_time", label: "Full Time", description: "Standard full-time employment" },
        { name: "part_time", label: "Part Time", description: "Part-time employment" },
        { name: "intern", label: "Intern", description: "Internship position" },
        { name: "freelancer", label: "Freelancer", description: "Freelance/contract basis" },
        { name: "consultant", label: "Consultant", description: "Consultant role" },
        { name: "contract", label: "Contract", description: "Contract employment" },
        { name: "probationary", label: "Probationary", description: "Probationary period employee" },
      ], { onConflict: "name" });

    if (empErr) return NextResponse.json({ ok: false, step: "employment_types", error: empErr.message }, { status: 500 });

    // Seed permission rules
    const { error: permErr } = await supabaseAdmin
      .from("permission_rules")
      .upsert([
        { group_name: "ADMIN_ROLES", role_names: ["founder", "super_admin", "hr_admin"] },
        { group_name: "LEAD_AND_ABOVE", role_names: ["founder", "super_admin", "hr_admin", "team_lead"] },
        { group_name: "HR_ROLES", role_names: ["founder", "super_admin", "hr_admin"] },
        { group_name: "CAN_MANAGE_RESTAURANTS", role_names: ["founder", "super_admin", "hr_admin", "team_lead", "onboarding_executive"] },
        { group_name: "CAN_MANAGE_CAMPAIGNS", role_names: ["founder", "super_admin", "marketing_executive"] },
      ], { onConflict: "group_name" });

    if (permErr) return NextResponse.json({ ok: false, step: "permission_rules", error: permErr.message }, { status: 500 });

    console.log("[seed] All done!");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export const GET = seed;
export const POST = seed;