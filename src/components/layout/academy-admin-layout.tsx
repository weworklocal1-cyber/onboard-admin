"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap, Award, ClipboardList, Settings, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { name: "Courses", href: "/admin/academy/courses", icon: <BookOpen className="h-5 w-5" /> },
  { name: "Modules", href: "/admin/academy/modules", icon: <ClipboardList className="h-5 w-5" /> },
  { name: "Lessons", href: "/admin/academy/lessons", icon: <GraduationCap className="h-5 w-5" /> },
  { name: "Quizzes", href: "/admin/academy/quizzes", icon: <Award className="h-5 w-5" /> },
  { name: "Questions", href: "/admin/academy/questions", icon: <ClipboardList className="h-5 w-5" /> },
];

export default function AcademyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fullName, setFullName] = useState<string>("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = sessionStorage.getItem("adminUser");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setFullName(parsed.full_name || "");
        } catch {}
      }
    };
    fetchProfile();
  }, []);

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-academy-primary to-academy-secondary flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900 tracking-tight">Academy</div>
              <div className="text-[10px] font-semibold text-academy-primary uppercase tracking-widest">Admin Panel</div>
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
                    ? "bg-academy-primary/10 text-academy-primary font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-academy-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 shrink-0">
          {fullName && (
            <div className="mb-2 px-2 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-900 truncate">{fullName}</p>
              <span className="text-[10px] font-semibold text-gray-500">
                Admin
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
            <BookOpen className="h-5 w-5 text-academy-primary" />
            <span className="text-gray-900">Academy Admin</span>
          </div>
        </header>

        <div className="flex-1 p-6">{children}</div>
        <Toaster position="top-right" />
      </main>
    </div>
  );
}