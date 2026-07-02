"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAdminRole(allowedRoles: string[] = ["founder", "super_admin", "hr_admin"]) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await createClient()
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = data?.role || null;
      setRole(userRole);
      setAuthorized(userRole ? allowedRoles.includes(userRole) : false);
      setLoading(false);
    };
    checkRole();
  }, [allowedRoles]);

  return { loading, authorized, role };
}
