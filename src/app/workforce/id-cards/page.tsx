"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/workforce";
import { IdCard } from "@/components/ui/id-card";
import { Printer, Search, FileDown } from "lucide-react";
import { toast } from "sonner";

export default function IdCardsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);

  const fetchEmployees = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    if (error) toast.error("Failed to load employees: " + error.message);
    else setEmployees(data || []);
    setFetching(false);
  };

  const exportToPdf = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/id-cards?format=pdf`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  const exportToWord = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workforce/id-cards?format=word`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "employee-id-cards.doc";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export Word document");
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchEmployees();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const handlePrintAll = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <style jsx>{`
        @media print {
          .print-area { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 0.25in; 
          }
          .print-hidden { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between print-hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ID Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate and print employee ID cards
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPdf} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportToWord} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export Word
          </Button>
          <Button onClick={handlePrintAll} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print All Cards
          </Button>
        </div>
      </div>

      <div className="print-hidden">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {fetching ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🪪</p>
          <p className="font-semibold text-gray-600">
            {search ? "No results found" : "No employees"}
          </p>
        </div>
      ) : (
        <div className="print-area grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map((emp) => (
            <IdCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}
    </div>
  );
}