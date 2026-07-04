"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Restaurant Partners", href: "/restaurant-partners" },
  { name: "Delivery Partners", href: "/delivery-partners" },
  { name: "Careers", href: "/careers" },
  { name: "About Us", href: "/about-us" },
  { name: "Contact", href: "/contact-us" },
  { name: "Support", href: "/support" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [pathname]);

  if (pathname.startsWith("/workforce")) return null;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "glass-strong shadow-md" : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-md">
              <span className="text-lg font-black text-white tracking-tighter">L</span>
            </div>
            <span className={cn("text-lg font-black tracking-tight", scrolled ? "text-white" : "text-gray-900")}>
              LOCALWALA<span className={cn(scrolled ? "text-white" : "text-brand-primary")}> FOOD</span>
            </span>
          </Link>

          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200",
                  pathname === item.href
                    ? "text-brand-primary bg-brand-light"
                    : "text-gray-600 hover:text-brand-primary hover:bg-gray-50"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:block">
            <Link
              href="/restaurant-partners"
              className="gradient-primary inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden glass-strong border-t"
          >
            <div className="space-y-1 px-4 pb-4 pt-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-4 py-3 text-base font-semibold transition-colors",
                    pathname === item.href
                      ? "text-brand-primary bg-brand-light"
                      : "text-gray-600 hover:text-brand-primary hover:bg-gray-50"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/restaurant-partners"
                className="mt-3 block w-full rounded-lg gradient-primary px-4 py-3 text-center text-base font-bold text-white shadow-md"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
