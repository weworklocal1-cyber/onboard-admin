"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download } from "lucide-react";

interface Certificate {
  certificate_id: string;
  course: { title: string } | { title: string }[];
  user_name: string;
  issued_at: string;
  score: number;
}

export default function CertificateViewPage({ params }: { params: { certificateId: string } }) {
  const supabase = createClient();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    const fetchCertificate = async () => {
      const { data } = await supabase
        .from("academy_certificates")
        .select(`
          certificate_id,
          course:academy_courses!inner(title),
          issued_at,
          score,
          user_name
        `)
        .eq("certificate_id", params.certificateId)
        .single();

      setCertificate(data);

      if (data) {
        try {
          const baseUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
            ? window.location.origin
            : (process.env.NEXT_PUBLIC_APP_URL || "https://localwala.tech");
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}/academy/certificates/verify/${data.certificate_id}`)}`;
          setQrCode(qrUrl);
        } catch (qrError) {
          console.error("QR generation failed:", qrError);
        }
      }
    };
    fetchCertificate();
  }, [supabase, params.certificateId]);

  const handleDownload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;

    const res = await fetch(`/api/academy/certificates/${params.certificateId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const html = await res.text();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (!certificate) {
    return <div className="text-center py-12">Certificate not found</div>;
  }

  const courseTitle = Array.isArray(certificate.course) ? certificate.course[0]?.title : certificate.course?.title;
  const userName = certificate.user_name;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-academy-primary text-white px-4 py-2 rounded-lg hover:bg-academy-secondary transition"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        <div id="certificate" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase">WeWorkLocal Academy</p>
                <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Certificate of Achievement</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 tracking-wider">CERTIFICATE ID</p>
                <p className="text-xs font-mono text-slate-300 mt-0.5">{certificate.certificate_id}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-10">
            <div className="text-center space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 tracking-wider uppercase">This certificate is proudly presented to</p>
                <p className="text-4xl font-bold text-slate-900 mt-3 tracking-tight">{userName}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 tracking-wider uppercase">For successfully completing</p>
                <p className="text-2xl font-bold text-academy-secondary mt-3">{courseTitle}</p>
              </div>

              <div className="flex items-center justify-center gap-6 pt-6">
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Score</p>
                  <p className="text-2xl font-bold text-slate-900">{certificate.score}%</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Date Issued</p>
                  <p className="text-base font-semibold text-slate-900">{new Date(certificate.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>

              {qrCode && (
                <div className="pt-4">
                  <img src={qrCode} alt="QR Code" className="w-24 h-24 mx-auto" />
                  <p className="text-[10px] text-slate-400 mt-1 tracking-wider">SCAN TO VERIFY</p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200">
              <div className="flex items-end justify-between">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 italic" style={{ fontFamily: "'Brush Script MT','Lucida Handwriting',cursive" }}>
                    Mandava Charan Teja
                  </p>
                  <div className="w-32 h-px bg-slate-800 mt-2 mb-2 mx-auto" />
                  <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">Founder</p>
                </div>
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-2">
                    <div className="absolute inset-0 rounded-full border-[3px] border-red-700/80 rotate-[-8deg] scale-110" />
                    <div className="absolute inset-0 rounded-full border-2 border-red-700/50 rotate-[6deg] scale-105" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black tracking-widest text-red-800 uppercase leading-tight rotate-[-3deg]">WeWorkLocal</span>
                      <span className="text-[10px] leading-none text-red-700">★★★★</span>
                    </div>
                  </div>
                  <div className="w-32 h-px bg-slate-800 mt-2 mb-2 mx-auto" />
                  <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">Authorized Stamp</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
            <p className="text-center text-[10px] text-slate-400 tracking-wider">
              Powered by LocalWala & WeWorkLocal | Verify at localwala.tech/academy/certificates/verify/{certificate.certificate_id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}