"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy as LifeBuoyIcon, Mail, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SupportPage() {
  const supabase = createClient();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("All fields are required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const res = await fetch("/api/academy/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to send");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Support</h1>
        <p className="text-gray-500">Get help with your learning journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Mail className="h-8 w-8 text-academy-primary mx-auto mb-2" />
            <p className="font-semibold">Email Us</p>
            <p className="text-sm text-gray-500">support@localwala.tech</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <Phone className="h-8 w-8 text-academy-primary mx-auto mb-2" />
            <p className="font-semibold">Call Us</p>
            <p className="text-sm text-gray-500">+91 XXXXX XXXXX</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <MessageSquare className="h-8 w-8 text-academy-primary mx-auto mb-2" />
            <p className="font-semibold">Chat</p>
            <p className="text-sm text-gray-500">Mon-Fri 9AM-6PM</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Form</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Message Sent</h3>
              <p className="text-sm text-gray-500">We will get back to you shortly.</p>
              <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", message: "" }); }}>
                Send Another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Your name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              <Input placeholder="Your email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              <Textarea placeholder="How can we help?" rows={4} value={form.message} onChange={(e) => updateField("message", e.target.value)} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full bg-academy-primary hover:bg-academy-secondary" disabled={submitting}>
                {submitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
