"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_ROLES = ["founder", "super_admin", "hr_admin"];

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = sessionStorage.getItem("adminAuthToken");
      
      if (!storedToken) {
        router.replace("/admin");
        return;
      }

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        headers["Authorization"] = `Bearer ${storedToken}`;
        const res = await fetch("/api/admin/me", { headers });
        
        if (!res.ok) {
          sessionStorage.removeItem("adminAuthToken");
          sessionStorage.removeItem("adminUser");
          router.replace("/admin");
          return;
        }
      } catch {
        router.replace("/admin");
        return;
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}
