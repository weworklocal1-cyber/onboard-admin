import { Metadata } from "next";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Your LocalWala Account",
  description: "Request account deletion from LocalWala. Learn what data is deleted and what is retained for legal compliance.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-28 pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <Badge variant="brand" className="mb-6">Account</Badge>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Delete Your LocalWala Account
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              We&apos;re sorry to see you go. Here&apos;s how to delete your account.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <ScrollReveal delay={0.1}>
            <GlassCard className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Deletion Request</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                You can permanently delete your LocalWala account at any time using one of the methods below.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-900 mb-3">Delete Through App</h3>
                  <ol className="space-y-2 text-gray-600 list-decimal list-inside">
                    <li>Open LocalWala app</li>
                    <li>Go to Profile → Settings</li>
                    <li>Tap &quot;Delete Account&quot;</li>
                    <li>Confirm with your password</li>
                  </ol>
                </div>
                
                <div className="p-6 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-900 mb-3">Delete Through Email</h3>
                  <p className="text-gray-600 mb-3">Send a request to:</p>
                  <a href="mailto:support@localwala.tech" className="text-brand-primary font-semibold">
                    support@localwala.tech
                  </a>
                </div>
              </div>
            </GlassCard>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <GlassCard className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Required Verification Details</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-brand-primary font-bold">•</span>
                  <span><strong>Name</strong> – As registered on your account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-primary font-bold">•</span>
                  <span><strong>Mobile Number</strong> – Linked to your profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-primary font-bold">•</span>
                  <span><strong>Email Address</strong> – Used for verification</span>
                </li>
              </ul>
            </GlassCard>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <GlassCard className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Deleted</h2>
              <p className="text-gray-600 mb-4">The following data will be permanently removed:</p>
              <ul className="grid md:grid-cols-2 gap-3 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Profile Information
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Saved Addresses
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Preferences & Settings
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Login Information
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Order Data
                </li>
              </ul>
            </GlassCard>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <GlassCard className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retained</h2>
              <p className="text-gray-600 mb-4">Certain information is kept for legal reasons:</p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Legal Compliance</strong> – Required by applicable laws</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Fraud Prevention</strong> – For security investigations</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Tax Records</strong> – As required by tax authorities</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  <strong>Retention Period:</strong> Up to 90 Days
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Processing Time:</strong> Within 7 Business Days
                </p>
              </div>
            </GlassCard>
          </ScrollReveal>

          <ScrollReveal delay={0.5}>
            <GlassCard className="p-8 md:p-10 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Have Questions?</h2>
              <p className="text-gray-600 mb-6">
                Our support team is here to help with your account deletion request.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a href="mailto:support@localwala.tech">
                  <Button variant="outline">support@localwala.tech</Button>
                </a>
                <Link href="/contact-us">
                  <Button>Contact Us</Button>
                </Link>
              </div>
            </GlassCard>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}