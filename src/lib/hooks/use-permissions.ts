"use client";

import { useMemo } from "react";
import { useLookups } from "./use-lookup";
import { UserRole } from "@/types/workforce";

export function usePermissions() {
  const { permissions } = useLookups();

  const groups = useMemo(() => permissions, [permissions]);

  const hasRole = (role: UserRole, groupName: keyof typeof groups) => {
    const group = groups[groupName];
    return Array.isArray(group) && group.includes(role);
  };

  return {
    isAdmin: (role: UserRole) => hasRole(role, "ADMIN_ROLES"),
    isLeadOrAbove: (role: UserRole) => hasRole(role, "LEAD_AND_ABOVE"),
    isHr: (role: UserRole) => hasRole(role, "HR_ROLES"),
    canAccessRestaurantCRM: (role: UserRole) => hasRole(role, "CAN_MANAGE_RESTAURANTS"),
    canManageMarketing: (role: UserRole) => hasRole(role, "CAN_MANAGE_CAMPAIGNS"),
    groups,
  };
}
