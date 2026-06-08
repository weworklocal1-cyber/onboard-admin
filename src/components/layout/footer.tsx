"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

const footerLinks = {
  platform: [
    { name: "Restaurant Partners", href: "/restaurant-partners" },
    { name: "Delivery Partners", href: "/delivery-partners" },
    { name: "Careers", href: "/careers" },
    { name: "About Us", href: "/about-us" },
    { name: "Contact Us", href: "/contact-us" },
  ],
  solutions: [
    { name: "Restaurant Onboarding", href: "#" },
    { name: "Delivery Network", href: "#" },
    { name: "Technology", href: "#" },
    { name: "Business Growth", href: "#" },
  ],
  company: [
    { name: "Our Story", href: "/about-us" },
    { name: "Careers", href: "/careers" },
    { name: "Partners", href: "#" },
    { name: "Legal", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-gray-900 text-gray-300">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1a1208] to-gray-900" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-md">
                  <span className="text-lg font-black text-white tracking-tighter">L</span>
                </div>
                <span className="text-lg font-black tracking-tight text-white">
                  LOCALWALA<span className="text-brand-primary"> FOOD</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-gray-400 leading-relaxed text-sm">
                Delivering Local. Empowering Businesses.
                We&apos;re building the future of local commerce through technology.
              </p>
              <div className="mt-6 flex gap-3">
                {["FB", "TW", "IG", "LN"].map((social) => (
                  <Link
                    key={social}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-400 transition-all hover:bg-brand-primary hover:text-white hover:-translate-y-1"
                  >
                    {social}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.platform.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm text-gray-400 transition-colors hover:text-brand-primary">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Solutions</h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.solutions.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm text-gray-400 transition-colors hover:text-brand-primary">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Contact</h3>
              <ul className="mt-4 space-y-4">
                 <li className="flex items-start gap-3 text-sm text-gray-400">
                   <Mail className="mt-0.5 h-4 w-4 text-brand-primary flex-shrink-0" />
                   <span>{siteConfig.contact.email}</span>
                 </li>
                 <li className="flex items-start gap-3 text-sm text-gray-400">
                   <Phone className="mt-0.5 h-4 w-4 text-brand-primary flex-shrink-0" />
                   <span>{siteConfig.contact.phone}</span>
                 </li>
                 <li className="flex items-start gap-3 text-sm text-gray-400">
                   <MapPin className="mt-0.5 h-4 w-4 text-brand-primary flex-shrink-0" />
                   <span>{siteConfig.contact.address}</span>
                 </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} LocalWala Food. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-gray-500 transition-colors hover:text-brand-primary">Privacy Policy</Link>
              <Link href="#" className="text-sm text-gray-500 transition-colors hover:text-brand-primary">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
