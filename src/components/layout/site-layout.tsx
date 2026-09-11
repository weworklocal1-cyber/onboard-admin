"use client";

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const INTERNAL_PREFIXES = ["/academy", "/workforce", "/admin"];

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    // Suppress benign web-vitals startTime error (Next 14 + web-vitals 3 on some browsers)
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes("startTime") && e.filename?.includes("web-vitals")) return;
      if (e.error?.message?.includes("startTime")) {
        e.preventDefault();
      }
    };
    window.addEventListener("error", handler);
    // Patch PerformanceObserver missing entry guard (VM54 reportAllChanges)
    const orig = (window as any).PerformanceObserver;
    if (orig) {
      const Wrapped = function(this: any, cb: any) {
        const wrappedCb = (list: any, observer: any) => {
          try {
            const entries = list.getEntries?.() || [];
            if (!entries || entries.some((en: any) => !en || typeof en.startTime === "undefined")) return;
          } catch {}
          return cb(list, observer);
        };
        return new orig(wrappedCb);
      } as any;
      Wrapped.supportedEntryTypes = orig.supportedEntryTypes;
      (window as any).PerformanceObserver = Wrapped;
    }
    return () => window.removeEventListener("error", handler);
  }, []);

  if (isInternal) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}