"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Mail, Phone, Clock, LifeBuoy, Send } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.name) { setError("Name is required"); return; }
    if (!formData.email) { setError("Email is required"); return; }
    if (!formData.message) { setError("Message is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-subtle">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-10 max-w-lg text-center shadow-2xl">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6">
            <Send className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Message Sent!</h2>
          <p className="text-gray-600 mb-8">Thank you for reaching out. We&apos;ll get back to you as soon as possible.</p>
          <Button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", mobile: "", subject: "", message: "" }); }} size="lg">Send Another Message</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="relative pt-24 pb-16 gradient-subtle overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <Badge variant="brand" className="mb-4">Support</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              How Can We <span className="text-brand-primary">Help?</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get support for your LocalWala app. Reach out and we&apos;ll resolve your query as soon as possible.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ScrollReveal>
                <GlassCard className="p-8 md:p-10 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow">
                      <LifeBuoy className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Send Us a Message</h2>
                  </div>
                  {error && <p className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</p>}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Full Name" required value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Your name" />
                      <Input label="Email Address" type="email" required value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Mobile Number" value={formData.mobile} onChange={(e) => updateField("mobile", e.target.value)} placeholder="+91 98765 43210" />
                      <Input label="Subject" required value={formData.subject} onChange={(e) => updateField("subject", e.target.value)} placeholder="How can we help?" />
                    </div>
                    <Textarea label="Message" required value={formData.message} onChange={(e) => updateField("message", e.target.value)} placeholder="Describe your issue or question..." rows={6} />
                    <Button type="submit" isLoading={submitting} size="lg" className="shadow-xl">
                      Send Message <Send className="ml-2 h-5 w-5" />
                    </Button>
                  </form>
                </GlassCard>
              </ScrollReveal>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScrollReveal delay={0.1}>
                  <GlassCard className="p-6 shadow-xl">
                    <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary shadow">
                      <LifeBuoy className="h-5 w-5 text-white" />
                    </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">In-App Chat</h3>
                        <p className="text-sm text-gray-600">Use the chat feature in your LocalWala app for instant support.</p>
                      </div>
                    </div>
                  </GlassCard>
                </ScrollReveal>
                <ScrollReveal delay={0.2}>
                  <GlassCard className="p-6 shadow-xl">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary shadow">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Email Support</h3>
                        <p className="text-sm text-gray-600">Drop us an email and our team will get back to you within 24 hours.</p>
                      </div>
                    </div>
                  </GlassCard>
                </ScrollReveal>
              </div>
            </div>

            <div>
              <ScrollReveal delay={0.2}>
                <GlassCard className="p-8 shadow-xl h-full">
                  <h2 className="text-xl font-black text-gray-900 mb-6">Get in Touch</h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary shadow">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{siteConfig.contact.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary shadow">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{siteConfig.contact.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary shadow">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Working Hours</p>
                        <p className="text-sm text-gray-600">{siteConfig.contact.workingHours}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 rounded-xl bg-brand-light border border-brand-primary/10">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Tip</h3>
                    <p className="text-sm text-gray-600">Have your order ID or registered mobile number ready to help us assist you faster.</p>
                  </div>
                </GlassCard>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
