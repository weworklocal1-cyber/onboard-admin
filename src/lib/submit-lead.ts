import { supabaseAdmin } from "@/lib/supabase";

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}

const TABLE_COLUMNS: Record<string, string[]> = {
  restaurant_partners: [
    "id","timestamp","status","owner_name","mobile","whatsapp","email",
    "restaurant_name","restaurant_type","state","district","city","locality",
    "landmark","full_address","pincode","latitude","longitude",
    "primary_locality","additional_localities","delivery_radius",
    "fssai_number","number_of_branches","average_daily_orders",
    "delivery_model","additional_notes"
  ],
  delivery_partners: [
    "id","timestamp","status","full_name","mobile","whatsapp","email",
    "state","district","city","locality","landmark","pincode",
    "vehicle_type","availability","working_model","salary_preference",
    "expected_income","latitude","longitude",
    "preferred_working_areas","max_travel_distance"
  ],
  careers: [
    "id","timestamp","status","full_name","mobile","whatsapp","email",
    "qualification","experience","current_company","current_salary",
    "expected_salary","state","district","city","locality",
    "position_applying_for","preferred_location","resume_link",
    "portfolio_link","linkedin_profile","portfolio_website",
    "cover_letter","employment_type","position","resumename","salary_range",
    "salaryrange"
  ],
  contact_leads: [
    "id","timestamp","status","name","email","mobile","subject","message"
  ],
};

export async function submitLead(table: string, data: Record<string, any>) {
  const allowed = new Set(TABLE_COLUMNS[table] || []);
  const row: Record<string, any> = { status: "new" };

  for (const [k, v] of Object.entries(data)) {
    const snake = toSnake(k);
    if (allowed.has(snake)) {
      row[snake] = v;
    } else {
      console.warn(`[submitLead] ${table}: skipping unknown field '${k}' (snake: '${snake}')`);
    }
  }

  const { error } = await supabaseAdmin
    .from(table)
    .insert([row]);

  if (error) throw new Error(error.message);
  return row;
}
