"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  Profile,
  EmployeeStatus,
  UserRole,
  Department,
  EmploymentType,
} from "@/types/workforce";
import { toast } from "sonner";
import { useLookups } from "@/lib/hooks/use-lookup";

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  on_leave: "bg-yellow-100 text-yellow-700",
  notice_period: "bg-orange-100 text-orange-700",
  internship_completed: "bg-blue-100 text-blue-700",
};

interface AddEmployeeForm {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  department: Department | null;
  designation: string;
  employment_type: EmploymentType;
  joining_date: string;
}

const DEFAULT_FORM: AddEmployeeForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role: "employee",
  department: null,
  designation: "",
  employment_type: "full_time",
  joining_date: new Date().toISOString().split("T")[0],
};

export default function EmployeesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { departments, roles, departmentRoles, employmentTypes } = useLookups();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddEmployeeForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = roles.map((role) => ({
    value: role.name,
    label: role.label || role.name,
  }));

  const departmentOptions = departments.map((dept) => ({
    value: dept.name,
    label: dept.description || dept.name,
  }));

  const employmentTypeOptions = employmentTypes.map((type) => ({
    value: type.name,
    label: type.label || type.name,
  }));

  const getFilteredRoles = (dept: Department | null) => {
    if (!dept) return roleOptions;
    const deptId = departments.find((current) => current.name === dept)?.id;
    if (!deptId) return roleOptions;
    const allowed = departmentRoles[deptId] || [];
    const allowedNames = new Set(allowed.map((item) => item.name));
    return roleOptions.filter((option) => allowedNames.has(option.value));
  };

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

  useEffect(() => {
    if (!profile) return;
    fetchEmployees();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase())
  );

  const field = (key: keyof AddEmployeeForm, value: string | null) =>
    setForm((prev) => ({ ...prev, [key]: value as AddEmployeeForm[keyof AddEmployeeForm] }));

  const closeModal = () => {
    setShowModal(false);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Full name, email and password are required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/create-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create employee");

      toast.success(`✅ ${form.full_name} has been added!`);
      closeModal();
      fetchEmployees();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {employees.length} total team member{employees.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>➕ Add Employee</Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name, email or designation…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Grid */}
      {fetching ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">👥</p>
          <p className="font-semibold text-gray-600">
            {search ? "No results found" : "No employees yet"}
          </p>
          <p className="text-sm mt-1">
            {search
              ? "Try a different search term"
              : "Add your first team member using the button above"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}

      {/* ─── Add Employee Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Employee</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Creates a Supabase Auth account + profile instantly
                </p>
              </div>
              <button
                onClick={closeModal}
                className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl font-light"
              >
                ×
              </button>
            </div>

            {/* Scrollable form body */}
            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto flex-1 px-6 py-5 space-y-4"
            >
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="e.g. Rahul Sharma"
                  value={form.full_name}
                  onChange={(e) => field("full_name", e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp_email">Email *</Label>
                  <Input
                    id="emp_email"
                    type="email"
                    placeholder="rahul@localwala.tech"
                    value={form.email}
                    onChange={(e) => field("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => field("phone", e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="emp_password">Temporary Password *</Label>
                <Input
                  id="emp_password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => field("password", e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-[11px] text-gray-400">
                  Share this with the employee — they can change it after first login.
                </p>
              </div>

              {/* Role + Department */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role *</Label>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => field("role", e.target.value)}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {getFilteredRoles(form.department).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={form.department ?? ""}
                    onChange={(e) => {
                      const newDept = e.target.value === "" ? null : (e.target.value as Department);
                      field("department", newDept);
                      const filtered = getFilteredRoles(newDept);
                      if (filtered.length > 0 && !filtered.some((r) => r.value === form.role)) {
                        field("role", filtered[0].value);
                      }
                    }}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">— Select —</option>
                    {departmentOptions.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Designation + Employment Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    placeholder="e.g. Field Executive"
                    value={form.designation}
                    onChange={(e) => field("designation", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <select
                    id="employment_type"
                    value={form.employment_type}
                    onChange={(e) => field("employment_type", e.target.value)}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {employmentTypeOptions.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => field("joining_date", e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating…
                    </span>
                  ) : (
                    "Create Employee"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Employee Card ───────────────────────────────────────────

function EmployeeCard({ employee }: { employee: Profile }) {
  const initials = employee.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-sm flex items-center justify-center shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">
              {employee.full_name}
            </p>
            <p className="text-[11px] text-gray-400 truncate font-mono">
              {employee.employee_id || "—"}
            </p>
          </div>
          <Badge
            className={`shrink-0 text-[10px] border-0 ${STATUS_COLORS[employee.status]}`}
          >
            {employee.status.replace(/_/g, " ")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        <p className="text-xs text-gray-600 truncate">📧 {employee.email}</p>
        {employee.phone && (
          <p className="text-xs text-gray-500">📞 {employee.phone}</p>
        )}
        {employee.designation && (
          <p className="text-xs text-gray-500">💼 {employee.designation}</p>
        )}
        <div className="flex gap-2 pt-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] capitalize">
            {employee.role.replace(/_/g, " ")}
          </Badge>
          {employee.department && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {employee.department}
            </Badge>
          )}
          {employee.employment_type && (
            <Badge variant="outline" className="text-[10px] capitalize text-gray-400">
              {employee.employment_type.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}