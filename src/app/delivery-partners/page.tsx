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
import {
  ChevronRight, Bike, Clock, Wallet, Shield, Headphones, TrendingUp,
  Smartphone, Tablet, Monitor, DollarSign, MapPin, Navigation, BarChart3,
  Users, Store, Truck, Smartphone as Phone, Package, Route, Award
} from "lucide-react";

const benefits = [
  { icon: Wallet, title: "Earn Competitive Rates", desc: "Best-in-class payout structure. Choose salary-based or per-order earnings — you decide." },
  { icon: Clock, title: "Flexible Hours", desc: "Full-time, part-time, or freelance. Work when it suits your lifestyle." },
  { icon: Shield, title: "Insurance Coverage", desc: "All delivery partners are covered by our comprehensive insurance policy." },
  { icon: Headphones, title: "24/7 Support", desc: "Dedicated support team for any issues on the road." },
  { icon: TrendingUp, title: "Growth Path", desc: "Clear career progression from Freelance → Fleet Manager." },
];

const vehicleTypes = ["Bike", "Scooter", "Bicycle"];
const availabilityOptions = ["Full Time", "Part Time", "Freelance", "Weekend Partner"];
const salaryModels = ["Salary Based", "Per Order Earnings", "Salary + Incentives", "Flexible Earnings"];
const incomeRanges = ["₹10,000 – ₹20,000", "₹20,000 – ₹30,000", "₹30,000 – ₹40,000", "₹40,000+"];
const workingModels = ["Freelance Delivery Partner", "Full-Time Delivery Partner", "Restaurant In-House Partner", "Hybrid Delivery Partner"];

const earningsComponents = [
  { icon: DollarSign, label: "Base Earnings" },
  { icon: Package, label: "Per Order Earnings" },
  { icon: Route, label: "Distance Incentives" },
  { icon: Clock, label: "Peak Hour Incentives" },
  { icon: Award, label: "Festival Bonuses" },
  { icon: Users, label: "Referral Rewards" },
  { icon: BarChart3, label: "Weekly Incentives" },
  { icon: TrendingUp, label: "Monthly Performance Rewards" },
];

const deliveryPartnerBenefits = [
  "Flexible Working Hours", "Weekly Payouts", "Transparent Earnings",
  "Incentive Programs", "Growth Opportunities", "Local Delivery Zones",
  "Training Support", "Dedicated Partner Support"
];

const growthPath = [
  { step: "01", title: "Freelance Partner", desc: "Start with flexible hours and per-order earnings." },
  { step: "02", title: "Senior Delivery Partner", desc: "Earn more with priority orders and bonuses." },
  { step: "03", title: "Team Leader", desc: "Lead a small team and earn leadership incentives." },
  { step: "04", title: "Fleet Coordinator", desc: "Manage multiple riders and delivery zones." },
  { step: "05", title: "Area Fleet Supervisor", desc: "Oversee operations across multiple areas." },
  { step: "06", title: "City Fleet Manager", desc: "Lead the entire city delivery network." },
];

export default function DeliveryPartnersPage() {
  const [formData, setFormData] = useState({
    fullName: "", mobileNumber: "", whatsappNumber: "", email: "",
    state: "", district: "", city: "", locality: "", landmark: "", pincode: "",
    vehicleType: "", availability: "", maxTravelDistance: "", workingModel: "",
    salaryPreference: "", expectedIncome: "",
    latitude: null as number | null, longitude: null as number | null,
    preferredWorkingAreas: [] as string[],
  });
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [workAreaInput, setWorkAreaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string | string[] | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const addWorkArea = (area: string) => {
    const trimmed = area.trim();
    if (trimmed && !workAreas.includes(trimmed)) {
      setWorkAreas([...workAreas, trimmed]);
      setFormData((prev) => ({ ...prev, preferredWorkingAreas: [...prev.preferredWorkingAreas, trimmed] }));
    }
    setWorkAreaInput("");
  };

  const removeWorkArea = (area: string) => {
    const next = workAreas.filter((w) => w !== area);
    setWorkAreas(next);
    setFormData((prev) => ({ ...prev, preferredWorkingAreas: prev.preferredWorkingAreas.filter((w) => w !== area) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.fullName) { setError("Full name is required"); return; }
    if (!formData.mobileNumber) { setError("Mobile number is required"); return; }
    if (!formData.vehicleType) { setError("Select a vehicle type"); return; }
    if (!formData.availability) { setError("Select availability"); return; }
    if (!formData.workingModel) { setError("Select your preferred working model"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/delivery-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
            <Bike className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Welcome to the Team!</h2>
          <p className="text-gray-600 mb-8">Your application has been submitted. Our team will contact you within 24-48 hours for the next steps.</p>
          <Button onClick={() => { setSubmitted(false); setFormData({ fullName: "", mobileNumber: "", whatsappNumber: "", email: "", state: "", district: "", city: "", locality: "", landmark: "", pincode: "", vehicleType: "", availability: "", maxTravelDistance: "", workingModel: "", salaryPreference: "", expectedIncome: "", latitude: null, longitude: null, preferredWorkingAreas: [] }); setWorkAreas([]); }} size="lg">
            Submit Another Application
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center pt-12">
          <ScrollReveal>
            <Badge variant="brand" className="mb-4">Delivery Partner Program</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              Choose The Delivery Career <span className="text-brand-primary">That Fits You</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Freelance, full-time, or restaurant in-house — pick the model that matches your lifestyle. Flexible hours + competitive earnings.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Choose Your Working Model" subtitle="4 flexible delivery career options" />
          <StaggerContainer className="mt-12 grid md:grid-cols-2 gap-6">
            <StaggerItem>
              <GlassCard hover className="p-8 h-full border-2 border-brand-primary/20">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-lg">
                  <Bike className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Freelance Delivery Partner</h3>
                <p className="text-sm text-gray-500 mb-4">Maximum flexibility. Work on your own schedule.</p>
                <ul className="space-y-2">
                  {["Work anytime, no fixed schedule", "Accept deliveries based on availability", "Earn per order + peak-hour incentives", "Festival & referral bonuses", "Multiple working zones"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-4 font-medium">Suitable for: Students, Part-timers, Gig workers</p>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard hover className="p-8 h-full">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Full-Time Delivery Partner</h3>
                <p className="text-sm text-gray-500 mb-4">Stable income with performance rewards and career growth.</p>
                <ul className="space-y-2">
                  {["Fixed monthly salary", "Performance & attendance incentives", "Delivery bonuses", "Weekly off policy", "Career growth opportunities"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-4 font-medium">Suitable for: Full-time workers, Long-term career seekers</p>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard hover className="p-8 h-full">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-lg">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Restaurant In-House Partner</h3>
                <p className="text-sm text-gray-500 mb-4">Work directly for a restaurant. Fixed schedules, fixed routes.</p>
                <ul className="space-y-2">
                  {["Direct restaurant employment", "Fixed salary", "Dedicated delivery area", "Restaurant-provided schedules", "Long-term stability"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-4 font-medium">Suitable for: Riders preferring fixed locations, Long-term employment</p>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard hover className="p-8 h-full">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-lg">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Hybrid Delivery Partner</h3>
                <p className="text-sm text-gray-500 mb-4">Best of both worlds. Work for restaurant + LocalWala network.</p>
                <ul className="space-y-2">
                  {["Dual earning opportunities", "Flexible schedules", "More order availability", "Expanded earning potential"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-4 font-medium">Employment Type: Hybrid</p>
              </GlassCard>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Earnings & Benefits" subtitle="Multiple ways to earn and grow with us" />
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="mt-12 grid md:grid-cols-2 gap-8">
              <GlassCard className="p-8">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-brand-primary" /> Income Components
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {earningsComponents.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                      <item.icon className="h-4 w-4 text-brand-primary" />
                      <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-8">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-brand-primary" /> Partner Benefits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {deliveryPartnerBenefits.map((benefit) => (
                    <Chip key={benefit} label={benefit} />
                  ))}
                </div>
              </GlassCard>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <GlassCard className="p-8 mt-8">
              <h3 className="text-lg font-black text-gray-900 mb-4">Salary & Earning Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Preferred Income Model</label>
                  <div className="grid grid-cols-2 gap-3">
                    {salaryModels.map((m) => (
                      <motion.button key={m} type="button" whileTap={{ scale: 0.97 }}
                        onClick={() => updateField("salaryPreference", m)}
                        className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${formData.salaryPreference === m ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200"}`}>
                        {m}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Expected Monthly Income</label>
                  <div className="grid grid-cols-2 gap-3">
                    {incomeRanges.map((r) => (
                      <motion.button key={r} type="button" whileTap={{ scale: 0.97 }}
                        onClick={() => updateField("expectedIncome", r)}
                        className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${formData.expectedIncome === r ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200"}`}>
                        {r}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Delivery Partner Growth Path" subtitle="Clear career progression with LocalWala Food" />
          </ScrollReveal>
          <div className="mt-12 grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {growthPath.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="relative">
                  <GlassCard className="p-5 text-center h-full">
                    <span className="text-2xl font-black text-brand-primary">{item.step}</span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </GlassCard>
                  {i < growthPath.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <ChevronRight className="h-4 w-4 text-brand-primary" />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 gradient-subtle">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Apply Now" subtitle="Choose your model and start earning" />
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <GlassCard className="p-8 md:p-10 shadow-xl mt-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</p>}

                <Input label="Full Name" required placeholder="Enter your full name"
                  value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Mobile Number" required placeholder="+91 98765 43210"
                    value={formData.mobileNumber} onChange={(e) => updateField("mobileNumber", e.target.value)} />
                  <Input label="WhatsApp Number" placeholder="+91 98765 43210"
                    value={formData.whatsappNumber} onChange={(e) => updateField("whatsappNumber", e.target.value)} />
                </div>
                <Input label="Email" type="email" placeholder="you@example.com"
                  value={formData.email} onChange={(e) => updateField("email", e.target.value)} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">State</label>
                    <select className="w-full h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                      value={formData.state} onChange={(e) => updateField("state", e.target.value)}>
                      <option value="">Select State</option>
                      {["Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Maharashtra"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Input label="District" placeholder="District"
                    value={formData.district} onChange={(e) => updateField("district", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="City" placeholder="City"
                    value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
                  <Input label="Locality" placeholder="Locality"
                    value={formData.locality} onChange={(e) => updateField("locality", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Landmark" placeholder="Near landmark"
                    value={formData.landmark} onChange={(e) => updateField("landmark", e.target.value)} />
                  <Input label="Pincode" placeholder="Pincode"
                    value={formData.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Preferred Working Model *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workingModels.map((m) => (
                      <motion.button key={m} type="button" whileTap={{ scale: 0.97 }}
                        onClick={() => updateField("workingModel", m)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${formData.workingModel === m ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200 hover:border-gray-300"}`}>
                        <span className="text-sm font-semibold text-gray-900">{m}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Vehicle Type *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {vehicleTypes.map((v) => (
                      <motion.button key={v} type="button" whileTap={{ scale: 0.97 }}
                        onClick={() => updateField("vehicleType", v)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${formData.vehicleType === v ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200"}`}>
                        <span className="text-sm font-semibold text-gray-900">{v}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Availability *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {availabilityOptions.map((a) => (
                      <motion.button key={a} type="button" whileTap={{ scale: 0.97 }}
                        onClick={() => updateField("availability", a)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${formData.availability === a ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200"}`}>
                        <span className="text-xs font-semibold text-gray-900">{a}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Input label="Maximum Travel Distance" placeholder="e.g., 10 km"
                  value={formData.maxTravelDistance}
                  onChange={(e) => updateField("maxTravelDistance", e.target.value)} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Preferred Working Areas</label>
                  <input type="text" placeholder="Type and press Enter to add"
                    value={workAreaInput}
                    onChange={(e) => setWorkAreaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWorkArea(workAreaInput); } }}
                    className="w-full h-11 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {workAreas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1 rounded-full border border-brand-primary/30 bg-brand-light px-3 py-1.5 text-sm font-medium text-brand-primary">
                        {area}
                        <button type="button" onClick={() => removeWorkArea(area)} className="rounded-full p-0.5 hover:bg-brand-primary/20">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <Button type="submit" isLoading={submitting} size="lg" className="w-full mt-4 shadow-xl">
                  Join Delivery Team
                </Button>
              </form>
            </GlassCard>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
