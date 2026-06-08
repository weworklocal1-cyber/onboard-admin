import { NextResponse } from "next/server";
import { submitLead } from "@/lib/submit-lead";

function convertFormFieldNames(obj: Record<string, any>): Record<string, any> {
  const fieldMap: Record<string, string> = {
    fullName: "full_name",
    mobileNumber: "mobile",
    whatsappNumber: "whatsapp",
    email: "email",
    vehicleType: "vehicle_type",
    maxTravelDistance: "max_travel_distance",
    workingModel: "working_model",
    salaryPreference: "salary_preference",
    expectedIncome: "expected_income",
    preferredWorkingAreas: "preferred_working_areas",
  };
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = fieldMap[key] || key.toLowerCase().replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
    result[mappedKey] = value;
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const convertedBody = convertFormFieldNames(body);
    const result = await submitLead("delivery_partners", convertedBody);
    return NextResponse.json({ success: true, message: "Submitted successfully", id: result.id });
  } catch (error: any) {
    console.error("[delivery-partners] submit error:", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
