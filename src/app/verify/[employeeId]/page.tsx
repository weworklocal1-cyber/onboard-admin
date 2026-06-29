import { supabaseAdmin } from "@/lib/supabase";

const COLORS = {
  primary: "#FF6B00",
  navy: "#111827",
  white: "#FFFFFF",
};

export const dynamic = "force-dynamic";

export default async function VerifyEmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;

  const { data: employee, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name, employee_id, email, phone, department, designation, emergency_contact, joining_date, profile_picture_url")
    .eq("employee_id", employeeId)
    .single();

  if (error || !employee) {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", padding: "40px", textAlign: "center", background: "#f8fafc", minHeight: "100vh" }}>
        <h1 style={{ color: COLORS.primary }}>LOCALWALA</h1>
        <p style={{ color: "#dc2626", margin: "20px 0" }}>Employee verification failed</p>
        <p>Employee ID not found: {employeeId}</p>
      </div>
    );
  }

  const joinDate = employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : "";
  const initials = employee.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: "400px", margin: "0 auto", background: COLORS.white, borderRadius: "16px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: `2px solid ${COLORS.primary}` }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: COLORS.navy }}>LOCALWALA</h1>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: COLORS.primary }}>Employee Verification</p>
        </div>
        
        {employee.profile_picture_url 
          ? <img src={employee.profile_picture_url} alt={employee.full_name} style={{ width: "100px", height: "100px", borderRadius: "12px", margin: "0 auto 16px", objectFit: "cover" as const }} />
          : <div style={{ width: "100px", height: "100px", borderRadius: "12px", margin: "0 auto 16px", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "32px" }}>{initials}</div>
        }
        
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Name</div>
          <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.full_name}</div>
        </div>
        
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Employee ID</div>
          <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.employee_id}</div>
        </div>
        
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Department</div>
          <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.department || "N/A"}</div>
        </div>
        
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Designation</div>
          <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.designation || "N/A"}</div>
        </div>
        
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Email</div>
          <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.email}</div>
        </div>
        
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Phone</div>
          <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.phone || "N/A"}</div>
        </div>
        
        {employee.emergency_contact && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Emergency Contact</div>
            <div style={{ fontSize: "14px", color: COLORS.navy }}>{employee.emergency_contact}</div>
          </div>
        )}
        
        {joinDate && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", color: COLORS.primary, fontWeight: 600, textTransform: "uppercase" }}>Joined Date</div>
            <div style={{ fontSize: "14px", color: COLORS.navy }}>{joinDate}</div>
          </div>
        )}
        
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <span style={{ background: COLORS.primary, color: COLORS.white, padding: "8px 16px", borderRadius: "9999px", fontWeight: 600 }}>✓ VERIFIED EMPLOYEE</span>
        </div>
      </div>
    </div>
  );
}