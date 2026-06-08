"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Chip } from "@/components/ui/chip";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ChevronRight, Upload, Briefcase, MapPin, Linkedin, Globe, FileText, DollarSign, Users, TrendingUp, Award, Heart } from "lucide-react";

const departments: Record<string, { title: string; dept: string; experience: string; type: string; location: string; skills: string[] }[]> = {
  "Business Development": [
    { title: "Business Development Manager", dept: "Business Development", experience: "0-2 years", type: "Full Time", location: "Vijayawada / Hyderabad", skills: ["Client management", "Negotiation", "Market research"] },
    { title: "Restaurant Acquisition Manager", dept: "Business Development", experience: "0-2 years", type: "Full Time", location: "Vijayawada", skills: ["Sales", "Communication", "Local market knowledge"] },
  ],
  "Digital Marketing": [
    { title: "Performance Marketing Specialist", dept: "Digital Marketing", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["Google Ads", "Meta Ads", "Analytics"] },
    { title: "Social Media Manager", dept: "Digital Marketing", experience: "0-2 years", type: "Full Time", location: "Remote", skills: ["Content creation", "Instagram", "LinkedIn"] },
  ],
  "Product & Technology": [
    { title: "React Developer", dept: "Product & Technology", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["React", "TypeScript", "Next.js"] },
    { title: "Flutter Developer", dept: "Product & Technology", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["Flutter", "Dart", "Firebase"] },
    { title: "Backend Developer", dept: "Product & Technology", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["Node.js", "PostgreSQL", "Redis"] },
    { title: "AI Engineer", dept: "Product & Technology", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["Python", "ML", "NLP"] },
  ],
  "Operations": [
    { title: "City Operations Manager", dept: "Operations", experience: "0-2 years", type: "Full Time", location: "Onsite", skills: ["Operations", "Logistics", "Team management"] },
    { title: "Fleet Operations Manager", dept: "Operations", experience: "0-2 years", type: "Full Time", location: "Onsite", skills: ["Fleet management", "Route planning", "Analytics"] },
  ],
  "Customer Experience": [
    { title: "Customer Support Executive", dept: "Customer Experience", experience: "0-2 years", type: "Full Time", location: "Onsite", skills: ["Communication", "Problem solving", "Hindi/English"] },
  ],
  "Human Resources": [
    { title: "HR Executive", dept: "Human Resources", experience: "0-2 years", type: "Full Time", location: "Onsite", skills: ["Recruitment", "Employee engagement", "HR policies"] },
  ],
  "Finance": [
    { title: "Accounts Executive", dept: "Finance", experience: "0-2 years", type: "Full Time", location: "Onsite", skills: ["Tally", "GST", "Excel"] },
  ],
  "Leadership": [
    { title: "Technology Head", dept: "Leadership", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["Architecture", "Team leadership", "Strategy"] },
    { title: "Product Head", dept: "Leadership", experience: "0-2 years", type: "Full Time", location: "Hybrid", skills: ["Product strategy", "Roadmapping", "User research"] },
  ],
};

const employeeBenefits = [
  "Competitive Salary", "Performance Bonuses", "Flexible Work Options",
  "Learning & Development Programs", "Career Growth Paths", "Leadership Opportunities",
  "Startup Culture", "Health Benefits", "Recognition Programs", "Employee Rewards"
];

export default function CareersPage() {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "", mobile: "", whatsapp: "", email: "",
    qualification: "", experience: "", currentCompany: "", currentSalary: "", expectedSalary: "",
    state: "", district: "", city: "", locality: "",
    positionApplyingFor: "", preferredLocation: "", employmentType: "", salaryRange: "",
    linkedinProfile: "", portfolioWebsite: "", coverLetter: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.fullName) { setError("Full name is required"); return; }
    if (!formData.mobile) { setError("Mobile number is required"); return; }
    if (!formData.email) { setError("Email is required"); return; }
    if (!formData.positionApplyingFor) { setError("Select a position"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, resumeName: resume?.name, portfolioName: portfolio?.name }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-subtle px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-10 max-w-lg text-center shadow-2xl">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6">
            <Briefcase className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Application Submitted!</h2>
          <p className="text-gray-600 mb-8">Our HR team will review and reach out within 5-7 business days.</p>
          <Button onClick={() => { setSubmitted(false); setSelectedRole(null); }} size="lg">Submit Another</Button>
        </motion.div>
      </div>
    );
  }

  const selectedJobData = selectedRole ? Object.values(departments).flat().find(j => j.title === selectedRole) : null;

  return (
    <div className="min-h-screen">
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center pt-12">
          <ScrollReveal>
            <Badge variant="brand" className="mb-4">Careers</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              Build The Future of <span className="text-brand-primary">Local Commerce</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Join LocalWala Food. Competitive salaries, growth paths, and a team that cares.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Open Positions" subtitle="Explore opportunities across all departments" />
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button onClick={() => setSelectedDept(null)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedDept === null ? "gradient-primary text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                All Roles
              </button>
              {Object.keys(departments).map((dept) => (
                <button key={dept} onClick={() => setSelectedDept(dept === selectedDept ? null : dept)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedDept === dept ? "gradient-primary text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {dept}
                </button>
              ))}
            </div>
          </ScrollReveal>

          <StaggerContainer className="mt-12 grid gap-4">
            {Object.entries(departments)
              .filter(([dept]) => !selectedDept || selectedDept === dept)
              .map(([dept, roles]) => (
                <StaggerItem key={dept}>
                  <GlassCard className="overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900">{dept}</h3>
                      <p className="text-sm text-gray-500 mt-1">{roles.length} open positions</p>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-3 space-y-3">
                      {roles.map((role) => (
                        <button key={role.title} type="button"
                          onClick={() => { setSelectedRole(role.title); updateField("positionApplyingFor", role.title); }}
                          className="w-full p-4 rounded-xl border border-gray-100 hover:border-brand-primary/30 hover:bg-brand-light/50 transition-all text-left">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-brand-primary">{role.title}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Chip label={role.type} />
                            <Chip label={role.location} />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Experience: {role.experience}</p>
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </StaggerItem>
              ))}
          </StaggerContainer>
        </div>
      </section>

      {selectedJobData && (
        <section className="py-8 gradient-subtle">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <GlassCard className="p-8 shadow-xl">
                <h3 className="text-2xl font-black text-gray-900 mb-2">{selectedJobData.title}</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  <Chip label={selectedJobData.dept} />
                  <Chip label={selectedJobData.type} />
                  <Chip label={selectedJobData.location} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJobData.skills.map((s) => (
                        <span key={s} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Experience Required</h4>
                    <p className="text-sm text-gray-600">{selectedJobData.experience}</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Competitive Salary", "Health Benefits", "Flexible Work", "Career Growth", "Learning Programs", "Startup Culture", "Recognition", "Remote Option"].map((b) => (
                    <div key={b} className="flex items-center gap-2 text-xs text-gray-600">
                      <ChevronRight className="h-3.5 w-3.5 text-brand-primary" />{b}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </ScrollReveal>
          </div>
        </section>
      )}

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Employee Benefits" subtitle="Everything we offer to our team" />
          <StaggerContainer className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {employeeBenefits.map((benefit) => (
              <StaggerItem key={benefit}>
                <GlassCard hover className="p-5 text-center">
                  <Heart className="mx-auto h-6 w-6 text-brand-primary mb-2" />
                  <p className="text-xs font-semibold text-gray-900">{benefit}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 gradient-subtle">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Apply Now" subtitle="Submit your application for the selected position" />
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <GlassCard className="p-8 md:p-10 shadow-xl mt-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</p>}
                {selectedJobData && <p className="p-3 rounded-lg bg-brand-light text-brand-primary text-sm font-semibold">Applying for: {selectedJobData.title}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Full Name" required placeholder="Enter full name"
                    value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
                  <Input label="Mobile" required placeholder="+91 98765 43210"
                    value={formData.mobile} onChange={(e) => updateField("mobile", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="WhatsApp" placeholder="+91 98765 43210"
                    value={formData.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} />
                  <Input label="Email" type="email" placeholder="you@example.com"
                    value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Qualification" placeholder="Your highest qualification"
                    value={formData.qualification} onChange={(e) => updateField("qualification", e.target.value)} />
                  <Input label="Experience (Years)" placeholder="e.g., 2"
                    value={formData.experience} onChange={(e) => updateField("experience", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Current Company" placeholder="Optional"
                    value={formData.currentCompany} onChange={(e) => updateField("currentCompany", e.target.value)} />
                  <Input label="Preferred Location" placeholder="City"
                    value={formData.preferredLocation} onChange={(e) => updateField("preferredLocation", e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="State" placeholder="State"
                    value={formData.state} onChange={(e) => updateField("state", e.target.value)} />
                  <Input label="District" placeholder="District"
                    value={formData.district} onChange={(e) => updateField("district", e.target.value)} />
                  <Input label="City / Locality" placeholder="City"
                    value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
                </div>

                <Input label="LinkedIn Profile" placeholder="https://linkedin.com/in/..."
                  value={formData.linkedinProfile} onChange={(e) => updateField("linkedinProfile", e.target.value)} />
                <Input label="Portfolio Website" placeholder="https://yourportfolio.com"
                  value={formData.portfolioWebsite} onChange={(e) => updateField("portfolioWebsite", e.target.value)} />
                <Textarea label="Cover Letter" placeholder="Tell us why you want to join LocalWala Food..."
                  value={formData.coverLetter} onChange={(e) => updateField("coverLetter", e.target.value)} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Resume Upload *</label>
                  <input type="file" accept=".pdf,.doc,.docx"
                    onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:gradient-primary file:text-white file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                  {resume && <p className="mt-2 text-xs text-gray-500">Selected: {resume.name}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Portfolio (Optional)</label>
                  <input type="file" accept=".pdf,.zip,.rar"
                    onChange={(e) => setPortfolio(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-semibold file:cursor-pointer hover:file:bg-gray-200" />
                </div>

                <Button type="submit" isLoading={submitting} size="lg" className="w-full shadow-xl">
                  Submit Application
                </Button>
              </form>
            </GlassCard>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
