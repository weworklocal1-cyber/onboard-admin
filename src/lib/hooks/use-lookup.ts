"use client";

import { useEffect, useMemo, useState } from "react";

export interface LookupOption {
  id: string;
  name: string;
  label?: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Lookups {
  departments: LookupOption[];
  roles: LookupOption[];
  departmentRoles: Record<string, LookupOption[]>;
  employmentTypes: LookupOption[];
  permissions: Record<string, string[]>;
}

export function useLookups() {
  const [data, setData] = useState<Lookups>({
    departments: [],
    roles: [],
    departmentRoles: {},
    employmentTypes: [],
    permissions: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const metadataRes = await fetch("/api/system/metadata", { signal: controller.signal });

        const metadata = (await metadataRes.json()) as Lookups;
        const deptData = metadata.departments || [];
        const roleData = metadata.roles || [];
        const employmentTypes = metadata.employmentTypes || [];
        const permissions = metadata.permissions || {};

        if (cancelled) return;

        const departmentRoles: Record<string, LookupOption[]> = {};
        await Promise.all(
          deptData.map(async (dept) => {
            const res = await fetch(`/api/workforce/departments/${dept.id}/roles`, {
              signal: controller.signal,
            });
            const rows = (await res.json()) as Array<{ role: LookupOption }>;
            departmentRoles[dept.id] = rows.map((row) => row.role);
          })
        );

        if (cancelled) return;
        setData({ departments: deptData, roles: roleData, departmentRoles, employmentTypes, permissions });
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.error("Failed to load lookups:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const roleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    data.roles.forEach((role) => {
      map[role.name] = role.label || role.name;
    });
    return map;
  }, [data.roles]);

  const roleColors = useMemo(() => {
    const palette = [
      "bg-purple-100 text-purple-700",
      "bg-red-100 text-red-700",
      "bg-blue-100 text-blue-700",
      "bg-indigo-100 text-indigo-700",
      "bg-gray-100 text-gray-600",
      "bg-emerald-100 text-emerald-700",
      "bg-yellow-100 text-yellow-700",
      "bg-pink-100 text-pink-700",
      "bg-orange-100 text-orange-700",
      "bg-teal-100 text-teal-700",
    ];
    const map: Record<string, string> = {};
    data.roles.forEach((role, idx) => {
      map[role.name] = palette[idx % palette.length];
    });
    return map;
  }, [data.roles]);

  const permissions = data.permissions;

  return {
    departments: data.departments,
    roles: data.roles,
    departmentRoles: data.departmentRoles,
    employmentTypes: data.employmentTypes,
    permissions,
    loading,
    roleLabels,
    roleColors,
  };
}
