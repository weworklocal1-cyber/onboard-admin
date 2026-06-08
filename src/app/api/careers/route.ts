import { NextResponse } from "next/server";
import { submitLead } from "@/lib/submit-lead";

function convertFormFieldNames(obj: Record<string, any>): Record<string, any> {
  const fieldMap: Record<string, string> = {
    fullName: "full_name",
    currentCompany: "current_company",
    currentSalary: "current_salary",
    expectedSalary: "expected_salary",
    positionApplyingFor: "position_applying_for",
    preferredLocation: "preferred_location",
    linkedinProfile: "linkedin_profile",
    portfolioWebsite: "portfolio_website",
    coverLetter: "cover_letter",
    employmenttype: "employment_type",
    employmentType: "employment_type",
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
    const result = await submitLead("careers", convertedBody);
    return NextResponse.json({ success: true, message: "Submitted successfully", id: result.id });
  } catch (error: any) {
    console.error("[careers] submit error:", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
