"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Profile, Department } from "@/types/workforce";
import { useLookups } from "@/lib/hooks/use-lookup";
import { toast } from "sonner";
import { Users, Search, Mail, Phone, MapPin, Building } from "lucide-react";

type ViewMode = "list" | "org";

export default function EmployeeDirectoryPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const { departments } = useLookups();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loadingData, setLoadingingData] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    if (!profile) return;
    fetchEmployees();
  }, [profile]);

  useEffect(() => {
    let result = employees;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.designation?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q)
      );
    }

    if (departmentFilter && departmentFilter !== "all") {
      result = result.filter((e) => e.department === departmentFilter);
    }

    setFiltered(result);
  }, [search, departmentFilter, employees]);

  const fetchEmployees = async () => {
    setLoadingingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/workforce/directories", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch employees");
      }

      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load directory");
    } finally {
      setLoadingingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Directory</h1>
          <p className="text-sm text-gray-500">Find colleagues and explore the org chart</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.name} value={dept.name}>
                  {dept.description || dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <Users className="h-4 w-4 mr-1" /> List
            </Button>
            <Button
              variant={viewMode === "org" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("org")}
              className="rounded-none"
            >
              <Users className="h-4 w-4 mr-1" /> Org Chart
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No employees found matching your criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <Card key={emp.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold">
                    {emp.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">{emp.full_name}</div>
                </CardTitle>
                <p className="text-xs text-gray-500 ml-10">{emp.designation || "N/A"}</p>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate text-xs">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs">{emp.phone}</span>
                  </div>
                )}
                {emp.department && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs capitalize">{emp.department.replace(/_/g, " ")}</span>
                  </div>
                )}
                {emp.work_location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs">{emp.work_location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {emp.employment_type?.replace(/_/g, " ") || "N/A"}
                  </Badge>
                  <Badge
                    className={
                      emp.status === "active"
                        ? "bg-green-100 text-green-700"
                        : emp.status === "on_leave"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {emp.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <OrgChartView employees={filtered} />
      )}
    </div>
  );
}

function OrgChartView({ employees }: { employees: Profile[] }) {
  const roots = employees.filter((e) => !e.reporting_manager_id);
  const tree = roots.map((root) => buildOrgNode(root, employees));

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-6 justify-center min-w-max">
        {tree.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No org chart data available. Assign reporting managers to build the hierarchy.</p>
        ) : (
          tree.map((node) => <OrgNode key={node.id} node={node} level={0} />)
        )}
      </div>
    </div>
  );
}

function buildOrgNode(employee: Profile, all: Profile[]): any {
  const children = all.filter((e) => e.reporting_manager_id === employee.id);
  return {
    ...employee,
    children: children.map((child) => buildOrgNode(child, all)),
  };
}

function OrgNode({ node, level }: { node: any; level: number }) {
  const [expanded, setExpanded] = useState(level < 2);

  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 w-64 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => node.children?.length > 0 && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
            {node.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{node.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{node.designation || "N/A"}</p>
            <p className="text-xs text-gray-400 truncate">{node.department?.replace(/_/g, " ") || ""}</p>
          </div>
        </div>
        {node.children?.length > 0 && (
          <p className="text-xs text-brand-primary mt-2 font-medium">
            {expanded ? "▲" : "▼"} {node.children.length} direct {node.children.length === 1 ? "report" : "reports"}
          </p>
        )}
      </div>
      {expanded && node.children?.length > 0 && (
        <div className="mt-4 relative">
          <div className="absolute left-1/2 top-0 w-px h-4 bg-gray-300 -translate-x-1/2 -mt-4" />
          <div className="flex gap-4">
            {node.children.map((child: any) => (
              <div key={child.id} className="relative">
                <div className="absolute left-1/2 -top-4 w-px h-4 bg-gray-300 -translate-x-1/2" />
                <OrgNode node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
