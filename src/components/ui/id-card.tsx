"use client";

import { forwardRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";

interface IdCardProps {
  employee: {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    department?: string | null;
    designation?: string | null;
    role?: string;
    profile_picture_url?: string | null;
    joining_date?: string | null;
    emergency_contact?: string | null;
  };
  className?: string;
}

const COLORS = {
  primary: "#FF6B00",
  navy: "#111827",
  white: "#FFFFFF",
  lightGray: "#F8FAFC",
  softGray: "#E5E7EB",
};

export function IdCard({ employee, className }: IdCardProps) {
  const initials = employee.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    const generateQr = async () => {
      try {
        // Use window location to detect dev vs prod
        const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
          ? window.location.origin
          : 'https://localwala.tech';
        const data = `${baseUrl}/verify/${employee.employee_id}`;
        const url = await QRCode.toDataURL(data, { 
          width: 300,
          margin: 3,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          }
        });
        setQrCode(url);
      } catch (err) {
        console.error("QR generation failed:", err);
        setQrCode("");
      }
    };
    generateQr();
  }, [employee.employee_id]);

  const handlePrint = () => {
    const printContent = document.getElementById(`id-card-${employee.id}`);
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Card - ${employee.full_name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 15mm; font-family: Arial, sans-serif; background: #f8fafc; }
              .id-card-container { display: flex; flex-wrap: wrap; gap: 10mm; justify-content: center; }
              img { image-rendering: pixelated; }
            }
          </style>
        </head>
        <body><div class="id-card-container">${printContent.innerHTML}</div></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const joinDate = employee.joining_date
    ? new Date(employee.joining_date).toLocaleDateString()
    : "";

  return (
    <div className={cn("w-full max-w-[2.125in]", className)}>
      <div
        id={`id-card-${employee.id}`}
        className="space-y-3"
      >
        {/* Front - CR80 Vertical Card */}
        <Card className="border-0 shadow-xl w-full overflow-hidden" style={{ 
          background: `radial-gradient(circle at 20% 0%, ${COLORS.lightGray} 0%, ${COLORS.white} 100%)`,
          borderRadius: "16px",
        }}>
          <CardContent className="p-0 flex flex-col relative" style={{ height: "85.6mm", width: "53.98mm" }}>
            {/* Top Header */}
            <div style={{ padding: "12px 10px 8px", textAlign: "center" }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: "18px", 
                fontWeight: "800",
                color: COLORS.navy,
                letterSpacing: "-0.5px",
              }}>
                LOCALWALA
              </h2>
              <p style={{
                margin: "2px 0 6px",
                fontSize: "9px",
                color: COLORS.primary,
                fontWeight: "600",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}>
                Powered by WeWorkLocal
              </p>
              <div style={{
                height: "2px",
                background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
                margin: "0 auto",
                width: "50px",
              }} />
            </div>

            {/* Employee Photo */}
            <div style={{ 
              padding: "0 20px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "center",
            }}>
              {employee.profile_picture_url ? (
                <img
                  src={employee.profile_picture_url}
                  alt={employee.full_name}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "12px",
                    objectFit: "cover",
                    border: "3px solid white",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
              ) : (
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary}80 100%)`,
                  color: COLORS.white,
                  fontWeight: "800",
                  fontSize: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}>
                  {initials}
                </div>
              )}
            </div>

            {/* Employee Details */}
            <div style={{ padding: "0 12px", textAlign: "center" }}>
              <h3 style={{
                margin: "0 0 4px",
                fontSize: "16px",
                fontWeight: "800",
                color: COLORS.navy,
                letterSpacing: "-0.3px",
                textTransform: "uppercase",
              }}>
                {employee.full_name}
              </h3>

              <div style={{ marginBottom: "8px" }}>
                <Badge variant="outline" style={{
                  fontSize: "10px",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}>
                  {employee.department || "Employee"}
                </Badge>
              </div>

              <div style={{ fontSize: "10px", color: COLORS.navy, lineHeight: "1.6" }}>
                <div style={{ marginBottom: "2px" }}><strong>ID:</strong> {employee.employee_id}</div>
                {employee.designation && (
                  <div style={{ marginBottom: "2px" }}><strong>{employee.designation}</strong></div>
                )}
                <div style={{ marginBottom: "2px" }}><strong>Email:</strong> {employee.email}</div>
                {employee.phone && (
                  <div style={{ marginBottom: "2px" }}><strong>Mobile:</strong> {employee.phone}</div>
                )}
                {employee.emergency_contact && (
                  <div style={{ marginBottom: "2px", fontSize: "9px" }}>
                    <strong>Emergency:</strong> {employee.emergency_contact}
                  </div>
                )}
                {joinDate && (
                  <div style={{ fontSize: "9px", color: COLORS.softGray, marginTop: "4px" }}>
                    Joined: {joinDate}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Side */}
        <Card className="border-0 shadow-xl w-full" style={{
          background: COLORS.navy,
          borderRadius: "16px",
        }}>
          <CardContent className="p-0 flex flex-col items-center justify-between" style={{ height: "85.6mm", width: "53.98mm" }}>
            {/* Header */}
            <div style={{ padding: "12px 10px 8px", textAlign: "center" }}>
              <h3 style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "800",
                color: COLORS.primary,
                letterSpacing: "-0.5px",
              }}>
                LOCALWALA
              </h3>
              <p style={{
                margin: "2px 0 0",
                fontSize: "9px",
                color: COLORS.softGray,
                fontWeight: "500",
              }}>
                Powered by WeWorkLocal
              </p>
            </div>

            {/* Large QR - Center */}
            <div style={{ textAlign: "center", padding: "16px 0", flex: 1 }}>
              <div style={{
                width: "210px",
                height: "210px",
                margin: "0 auto 6px",
                backgroundColor: COLORS.white,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}>
                {qrCode ? (
                  <img src={qrCode} alt="QR" style={{ width: "200px", height: "200px", imageRendering: "pixelated" }} />
                ) : (
                  <div style={{
                    width: "200px",
                    height: "200px",
                    backgroundColor: COLORS.primary,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ color: COLORS.white, fontSize: "14px", fontWeight: "bold" }}>LW-ID</span>
                  </div>
                )}
              </div>
              <p style={{ fontSize: "10px", color: COLORS.softGray, margin: 0, fontWeight: "500" }}>
                Scan to Verify Identity
              </p>
            </div>

            {/* Company Info */}
            <div style={{ padding: "0 16px", fontSize: "9px", color: COLORS.softGray, lineHeight: "1.8" }}>
              <div style={{ marginBottom: "4px" }}><strong style={{ color: COLORS.primary }}>Website:</strong></div>
              <div style={{ marginBottom: "8px", fontSize: "8px" }}>www.localwala.tech</div>

              <div style={{ marginBottom: "4px" }}><strong style={{ color: COLORS.primary }}>Support:</strong></div>
              <div style={{ marginBottom: "8px", fontSize: "8px" }}>support@localwala.tech</div>

              <div style={{ marginBottom: "4px" }}><strong style={{ color: COLORS.primary }}>Phone:</strong></div>
              <div style={{ fontSize: "8px" }}>+91 XXXXX XXXXX</div>
            </div>

            {/* Emergency Box */}
            <div style={{
              margin: "8px 12px",
              padding: "8px 10px",
              background: COLORS.white,
              borderRadius: "8px",
              width: "calc(100% - 24px)",
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: "9px", 
                color: COLORS.navy,
                fontWeight: "600",
                marginBottom: "4px",
              }}>
                EMERGENCY CONTACT
              </p>
              <p style={{ margin: "2px 0", fontSize: "8px", color: COLORS.navy }}>
                HR Helpline: +91 XXXXX XXXXX
              </p>
              <p style={{ margin: "2px 0", fontSize: "8px", color: COLORS.navy }}>
                Support: support@localwala.tech
              </p>
            </div>

            {/* Bottom Strip */}
            <div style={{
              width: "100%",
              padding: "8px 0",
              background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primary}80 100%)`,
              textAlign: "center",
              marginTop: "auto",
            }}>
              <p style={{
                margin: 0,
                fontSize: "8px",
                color: COLORS.white,
                fontWeight: "600",
                letterSpacing: "0.5px",
              }}>
                SECURE DIGITAL IDENTITY
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <button
        onClick={handlePrint}
        style={{
          marginTop: "12px",
          width: "100%",
          textAlign: "center",
          fontSize: "12px",
          color: COLORS.primary,
          background: "none",
          border: "1px solid " + COLORS.softGray,
          borderRadius: "8px",
          cursor: "pointer",
          padding: "8px",
          fontWeight: "500",
        }}
      >
        Print ID Card (Front & Back)
      </button>
    </div>
  );
}

IdCard.displayName = "IdCard";

export const IdCardPrint = forwardRef<HTMLDivElement, IdCardProps>(
  ({ employee }, ref) => {
    const initials = employee.full_name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div ref={ref} style={{ width: "53.98mm", height: "85.6mm" }}>
        <div style={{
          background: COLORS.white,
          borderRadius: "16px",
          padding: "10px",
          fontFamily: "Arial, sans-serif",
          border: "2px solid " + COLORS.primary,
        }}>
          <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "800", color: COLORS.navy }}>
            {employee.full_name}
          </h3>
          <p style={{ margin: "0 0 3px", fontSize: "10px", color: COLORS.primary }}>
            {employee.employee_id}
          </p>
          <p style={{ margin: "0 0 6px", fontSize: "9px", color: COLORS.navy }}>
            {employee.department || "Employee"}
          </p>
          <div style={{ fontSize: "8px", color: COLORS.navy, lineHeight: "1.6" }}>
            <div><strong>Email:</strong> {employee.email}</div>
            {employee.phone && <div><strong>Phone:</strong> {employee.phone}</div>}
            {employee.emergency_contact && <div><strong>Emergency:</strong> {employee.emergency_contact}</div>}
            {employee.joining_date && <div><strong>Joined:</strong> {new Date(employee.joining_date).toLocaleDateString()}</div>}
          </div>
        </div>
      </div>
    );
  }
);
IdCardPrint.displayName = "IdCardPrint";