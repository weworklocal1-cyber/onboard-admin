import { NextResponse } from "next/server";
import { submitLead } from "@/lib/submit-lead";

function convertFormFieldNames(obj: Record<string, any>): Record<string, any> {
  const fieldMap: Record<string, string> = {
    ownerName: "owner_name",
    mobileNumber: "mobile",
    whatsappNumber: "whatsapp",
    emailAddress: "email",
    restaurantName: "restaurant_name",
    restaurantType: "restaurant_type",
    fullAddress: "full_address",
    pincode: "pincode",
    latitude: "latitude",
    longitude: "longitude",
    primaryLocality: "primary_locality",
    additionalLocalities: "additional_localities",
    deliveryRadius: "delivery_radius",
    deliveryModel: "delivery_model",
    fssaiNumber: "fssai_number",
    numberOfBranches: "number_of_branches",
    averageDailyOrders: "average_daily_orders",
    additionalNotes: "additional_notes",
    submittedAt: "timestamp",
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
    const result = await submitLead("restaurant_partners", convertedBody);
    return NextResponse.json({ success: true, message: "Submitted successfully", id: result.id });
  } catch (error: any) {
    console.error("[restaurant-partners] submit error:", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
