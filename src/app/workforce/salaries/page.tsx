"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { SalaryRecord, Profile, PaymentFrequency, SalaryStatus } from "@/types/workforce";
import { toast } from "sonner";

export default function SalariesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Pick<Profile, 'id' | 'full_name' | 'department' | 'designation'>[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    gross_salary: "",
    base_salary: "",
    hra: "0",
    special_allowance: "0",
    performance_bonus: "0",
    travel_allowance: "0",
    medical_allowance: "0",
    other_allowances: "0",
    pf_employee: "0",
    pf_employer: "0",
    professional_tax: "0",
    tds: "0",
    other_deductions: "0",
    payment_frequency: "monthly" as PaymentFrequency,
    effective_from: new Date().toISOString().split("T")[0],
    perks: "",
    notes: "",
  });

  const isAdmin = !!profile?.role && ["founder", "super_admin", "hr_admin"].includes(profile.role);

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const [salariesRes, employeesRes] = await Promise.all([
      fetch("/api/workforce/salaries", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }),
      supabase.from("profiles").select("id, full_name, department, designation").order("full_name"),
    ]);
    
    const salariesData = await salariesRes.json();
    setSalaries(salariesData.salaries || []);
    setEmployees(employeesRes.data as any || []);
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.gross_salary) {
      toast.error("Employee and gross salary are required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          employee_id: form.employee_id,
          gross_salary: Number(form.gross_salary),
          base_salary: Number(form.base_salary || 0),
          hra: Number(form.hra),
          special_allowance: Number(form.special_allowance),
          performance_bonus: Number(form.performance_bonus),
          travel_allowance: Number(form.travel_allowance),
          medical_allowance: Number(form.medical_allowance),
          other_allowances: Number(form.other_allowances),
          pf_employee: Number(form.pf_employee),
          pf_employer: Number(form.pf_employer),
          professional_tax: Number(form.professional_tax),
          tds: Number(form.tds),
          other_deductions: Number(form.other_deductions),
          payment_frequency: form.payment_frequency,
          effective_from: form.effective_from,
          perks: form.perks || null,
          notes: form.notes || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create salary record");

      toast.success("Salary record added!");
      setShowAddModal(false);
      setForm({
        employee_id: "", gross_salary: "", base_salary: "", hra: "0",
        special_allowance: "0", performance_bonus: "0", travel_allowance: "0",
        medical_allowance: "0", other_allowances: "0", pf_employee: "0",
        pf_employer: "0", professional_tax: "0", tds: "0", other_deductions: "0",
        payment_frequency: "monthly", effective_from: new Date().toISOString().split("T")[0],
        perks: "", notes: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add salary");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateNet = () => {
    const gross = Number(form.gross_salary || 0);
    const pf = Number(form.pf_employee || 0);
    const pt = Number(form.professional_tax || 0);
    const tds = Number(form.tds || 0);
    const other = Number(form.other_deductions || 0);
    return gross - pf - pt - tds - other;
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Designation", "Department", "Gross Salary", "Net Salary", "Frequency", "Effective From", "Effective To", "Status"];
    const rows = salaries.map(s => [
      s.employee?.full_name || "",
      s.employee?.designation || "",
      s.employee?.department || "",
      Number(s.gross_salary).toLocaleString(),
      Number(s.net_salary || s.gross_salary).toLocaleString(),
      s.payment_frequency?.replace(/_/g, " ") || "",
      s.effective_from ? new Date(s.effective_from).toLocaleDateString() : "",
      s.effective_to ? new Date(s.effective_to).toLocaleDateString() : "",
      s.status || "",
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `salaries_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPayslip = (salary: SalaryRecord) => {
    setSelectedSalary(salary);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? "Salary Management" : "My Salary"}</h1>
          <p className="text-gray-500">
            {isAdmin ? "Manage employee salaries and payouts" : "View your salary history and payslips"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>📥 Export CSV</Button>
            <Button onClick={() => setShowAddModal(true)}>💰 Add Salary</Button>
          </div>
        )}
      </div>

      {salaries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">💰</p>
          <p className="font-semibold text-gray-600">
            {isAdmin ? "No salary records" : "No salary records found"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {salaries.map((salary) => (
            <SalaryCard key={salary.id} salary={salary} isAdmin={isAdmin} onViewPayslip={() => printPayslip(salary)} />
          ))}
        </div>
      )}

      {showAddModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Add Salary Record</h2>
            </div>
            <form onSubmit={handleAddSalary} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Employee *</Label>
                  <select
                    value={form.employee_id}
                    onChange={e => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Frequency</Label>
                  <select
                    value={form.payment_frequency}
                    onChange={e => setForm({ ...form, payment_frequency: e.target.value as PaymentFrequency })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Earnings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Gross Salary *</Label>
                    <Input
                      type="number"
                      value={form.gross_salary}
                      onChange={e => setForm({ ...form, gross_salary: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Base Salary</Label>
                    <Input
                      type="number"
                      value={form.base_salary}
                      onChange={e => setForm({ ...form, base_salary: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>HRA</Label>
                    <Input
                      type="number"
                      value={form.hra}
                      onChange={e => setForm({ ...form, hra: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Special Allowance</Label>
                    <Input
                      type="number"
                      value={form.special_allowance}
                      onChange={e => setForm({ ...form, special_allowance: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Performance Bonus</Label>
                    <Input
                      type="number"
                      value={form.performance_bonus}
                      onChange={e => setForm({ ...form, performance_bonus: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Travel Allowance</Label>
                    <Input
                      type="number"
                      value={form.travel_allowance}
                      onChange={e => setForm({ ...form, travel_allowance: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Medical Allowance</Label>
                    <Input
                      type="number"
                      value={form.medical_allowance}
                      onChange={e => setForm({ ...form, medical_allowance: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Other Allowances</Label>
                    <Input
                      type="number"
                      value={form.other_allowances}
                      onChange={e => setForm({ ...form, other_allowances: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Deductions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>PF (Employee)</Label>
                    <Input
                      type="number"
                      value={form.pf_employee}
                      onChange={e => setForm({ ...form, pf_employee: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>PF (Employer)</Label>
                    <Input
                      type="number"
                      value={form.pf_employer}
                      onChange={e => setForm({ ...form, pf_employer: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Professional Tax</Label>
                    <Input
                      type="number"
                      value={form.professional_tax}
                      onChange={e => setForm({ ...form, professional_tax: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>TDS</Label>
                    <Input
                      type="number"
                      value={form.tds}
                      onChange={e => setForm({ ...form, tds: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Other Deductions</Label>
                    <Input
                      type="number"
                      value={form.other_deductions}
                      onChange={e => setForm({ ...form, other_deductions: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-semibold">Net Salary: </span>
                  <span className="text-xl font-bold text-brand-primary">₹{calculateNet().toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Effective From *</Label>
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={e => setForm({ ...form, effective_from: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Perks</Label>
                <Input
                  placeholder="e.g. Health insurance, Laptop"
                  value={form.perks}
                  onChange={e => setForm({ ...form, perks: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Salary Record"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSalary && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Payslip</h2>
                <p className="text-xs text-gray-500">
                  {new Date(selectedSalary.effective_from).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedSalary(null)}>✕</Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{profile?.full_name || "Employee"}</p>
                  <p className="text-sm text-gray-500">{selectedSalary.employee?.designation}</p>
                </div>
                <Badge variant="outline" className="capitalize">{selectedSalary.payment_frequency?.replace(/_/g, " ")}</Badge>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gross Salary</span>
                  <span className="font-semibold">₹{Number(selectedSalary.gross_salary).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Salary</span>
                  <span>₹{Number(selectedSalary.base_salary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">HRA</span>
                  <span>₹{Number(selectedSalary.hra || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Special Allowance</span>
                  <span>₹{Number(selectedSalary.special_allowance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Performance Bonus</span>
                  <span>₹{Number(selectedSalary.performance_bonus || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PF (Employee)</span>
                  <span>₹{Number(selectedSalary.pf_employee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Professional Tax</span>
                  <span>₹{Number(selectedSalary.professional_tax || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TDS</span>
                  <span>₹{Number(selectedSalary.tds || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net Salary</span>
                  <span className="text-xl font-bold text-brand-primary">
                    ₹{Number(selectedSalary.net_salary || selectedSalary.gross_salary).toLocaleString()}
                  </span>
                </div>
              </div>
              {selectedSalary.perks && (
                <p className="text-xs text-gray-500">🎁 {selectedSalary.perks}</p>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-2">
              <Button className="flex-1" onClick={() => window.print()}>🖨️ Print / Save PDF</Button>
              <Button variant="outline" onClick={() => setSelectedSalary(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryCard({ salary, isAdmin, onViewPayslip }: { salary: SalaryRecord; isAdmin?: boolean; onViewPayslip?: () => void }) {
  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{salary.employee?.full_name || "Employee"}</span>
          <Badge variant="outline">{salary.status}</Badge>
        </CardTitle>
        <CardDescription>{salary.employee?.designation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-600">Gross Salary</span>
          <span className="font-semibold text-lg">₹{Number(salary.gross_salary).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-600">Net Salary</span>
          <span className="font-bold text-brand-primary">₹{Number(salary.net_salary || salary.gross_salary).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-600">Frequency</span>
          <span className="text-sm capitalize">{salary.payment_frequency?.replace(/_/g, " ")}</span>
        </div>
        {salary.perks && (
          <p className="text-xs text-gray-500 mt-2">🎁 {salary.perks}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Effective: {new Date(salary.effective_from).toLocaleDateString()}
        </p>
        {salary.effective_to && (
          <p className="text-xs text-gray-400">
            To: {new Date(salary.effective_to).toLocaleDateString()}
          </p>
        )}
        {!isAdmin && onViewPayslip && (
          <Button size="sm" variant="outline" className="w-full mt-3" onClick={onViewPayslip}>
            📄 View Payslip
          </Button>
        )}
      </CardContent>
    </Card>
  );
}