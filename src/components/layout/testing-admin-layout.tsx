"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/workforce";
import { useLookups } from "@/lib/hooks/use-lookup";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Testing Dashboard",
    href: "/admin/testing",
    icon: "🧪",
  },
  {
    name: "Features",
    href: "/admin/testing/features",
    icon: "⚡",
  },
  {
    name: "Feedback",
    href: "/admin/testing/feedback",
    icon: "💬",
  },
  {
    name: "Testers",
    href: "/admin/testing/testers",
    icon: "👥",
  },
  {
    name: "Versions",
    href: "/admin/testing/versions",
    icon: "🏷️",
  },
];

export default function TestingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [signingOut, setSigningOut] = useState(false);
  const { roleLabels, roleColors } = useLookups();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (data) {
        setRole(data.role as UserRole);
        setFullName(data.full_name || "");
      }
    };
    fetchProfile();
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/admin";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🧪</span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900 tracking-tight">Testing</div>
              <div className="text-[10px] font-semibold text-brand-primary uppercase tracking-widest">Admin Panel</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 shrink-0">
          {role && (
            <div className="mb-2 px-2 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-900 truncate">{fullName || "Admin"}</p>
              <span className={cn(
                "inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                roleColors[role] || "bg-gray-100 text-gray-600"
              )}>
                {roleLabels[role] || role}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-sm text-gray-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {signingOut ? "Signing out…" : "Sign Out"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:hidden shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-bold text-base flex items-center gap-1.5">
            <span className="text-xl">🧪</span>
            <span className="text-gray-900">Testing Admin</span>
          </div>
          {role && (
            <span className={cn(
              "ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full",
              roleColors[role] || "bg-gray-100 text-gray-600"
            )}>
              {roleLabels[role] || role}
            </span>
          )}
        </header>

        <div className="flex-1 p-6">{children}</div>
        <Toaster position="top-right" />
      </main>
    </div>
  );
}