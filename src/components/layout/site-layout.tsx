"use client";

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { usePathname } from "next/navigation";

const INTERNAL_PREFIXES = ["/academy", "/workforce", "/admin"];

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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