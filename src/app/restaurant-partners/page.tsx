"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { CheckCircle2, ChevronRight, MapPin, Search, Percent, Truck, Smartphone, Tablet, Monitor, UtensilsCrossed } from "lucide-react";

const restaurantTypes = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "bakery", label: "Bakery" },
  { value: "cloud_kitchen", label: "Cloud Kitchen" },
  { value: "sweet_shop", label: "Sweet Shop" },
  { value: "tiffin", label: "Tiffin Service" },
];

const statesData: Record<string, string[]> = {
  "Andhra Pradesh": ["Vijayawada", "Guntur", "Visakhapatnam"],
  "Telangana": ["Hyderabad", "Warangal"],
  "Karnataka": ["Bangalore", "Mysore"],
  "Tamil Nadu": ["Chennai", "Coimbatore"],
  "Maharashtra": ["Mumbai", "Pune"],
};

const localitiesData: Record<string, string[]> = {
  Vijayawada: ["Benz Circle", "Governorpet", "Patamata", "Labbipet", "Moghalrajpuram"],
  Guntur: ["Lakshmipuram", "Arundelpet", "Brodipet"],
  Hyderabad: [
    "West Hyderabad (IT & Premium Areas)",
    "Gachibowli", "HITEC City", "Madhapur", "Kondapur", "Kokapet", "Narsingi",
    "Financial District", "Nanakramguda", "Manikonda", "Puppalaguda", "Raidurg",
    "Kothaguda", "Khajaguda", "Tellapur", "Osman Nagar", "Kollur", "Mokila",
    "Gandipet", "Gowlidoddi", "Film Nagar", "Jubilee Hills", "Banjara Hills",
    "North-West Hyderabad",
    "Kukatpally", "KPHB Colony", "Miyapur", "Hafeezpet", "Chandanagar",
    "Lingampally", "Nizampet", "Bachupally", "Pragathi Nagar", "Allwyn Colony",
    "Moosapet", "RC Puram", "Patancheru", "Beeramguda", "Ameenpur", "Bollaram",
    "Kompally", "Suchitra", "Jeedimetla", "Suraram",
    "Central Hyderabad",
    "Ameerpet", "Begumpet", "Punjagutta", "Somajiguda", "Khairatabad",
    "Himayat Nagar", "Basheerbagh", "Lakdikapul", "Abids", "Nampally",
    "Koti", "Narayanguda", "Domalguda", "Hyderguda", "Chikkadpally", "Ashok Nagar",
    "East Hyderabad",
    "Uppal", "Nagole", "Habsiguda", "Ramanthapur", "Boduppal", "Peerzadiguda",
    "Pocharam", "Ghatkesar", "Medipally", "LB Nagar", "Hayathnagar",
    "Dilsukhnagar", "Vanasthalipuram", "Hasthinapuram", "Chaitanyapuri", "Kothapet",
    "North Hyderabad",
    "Secunderabad", "Malkajgiri", "Alwal", "Yapral", "Sainikpuri",
    "AS Rao Nagar", "Kapra", "ECIL", "Dammaiguda", "Nagaram",
    "Jawaharnagar", "Trimulgherry", "Bowenpally", "Bolarum",
    "South Hyderabad (Old City)",
    "Charminar", "Falaknuma", "Bahadurpura", "Chandrayangutta", "Barkas",
    "Santoshnagar", "Saidabad", "Yakutpura", "Dabeerpura", "Malakpet",
    "Jahanuma", "Shalibanda", "Hussaini Alam", "Moghalpura", "Kalapathar",
    "Airport Corridor & Emerging Areas",
    "Shamshabad", "Adibatla", "Thukkuguda", "Pedda Amberpet", "Maheshwaram",
    "Raviryal", "Tukkuguda", "Bongloor", "Mamidipally", "Hardware Park", "Pharma City",
  ],
  Bangalore: ["Koramangala", "Indiranagar", "Whitefield", "Jayanagar"],
  Chennai: ["T Nagar", "Adyar", "Guindy", "Anna Nagar"],
  Mumbai: ["Andheri", "Bandra", "Powai", "Malad"],
};

const whyChooseUs = [
  { stat: "15%", label: "Lower Commission", desc: "vs market average of 25-30%" },
  { stat: "24hrs", label: "Fast Settlements", desc: "No waiting for weekly payouts" },
  { stat: "10+", label: "Cities Covered", desc: "Expanding across South India" },
  { stat: "99%", label: "Partner Retention", desc: "Because we actually care" },
];

const appFeatures = [
  "Order Management", "Menu Management", "Live Order Tracking", "Delivery Tracking",
  "Sales Analytics", "Earnings Dashboard", "Customer Insights", "Profile Management",
  "Offer Management", "Business Growth Insights",
];

const kitchenFeatures = [
  "Kitchen Order Queue", "Order Status Updates", "Prep Time Management",
  "Live Kitchen Workflow", "Staff Coordination", "Ready For Pickup Alerts",
  "Delivery Integration", "Performance Analytics",
];

const posFeatures = [
  "Billing & Invoicing", "Inventory Management", "Order Management",
  "Staff Management", "Reports & Analytics", "GST Billing",
  "Expense Tracking", "Multi-Branch Management", "QR Ordering", "Customer Database",
];

const restaurantBenefits = [
  "Lower Commissions", "Dedicated Account Manager", "Marketing Support",
  "Business Growth Support", "Local Area Promotions", "In-App Promotions",
  "Faster Settlements", "Restaurant Analytics", "Customer Retention Tools", "Multi-Branch Support",
];

const deliveryOptions = [
  {
    title: "LocalWala Delivery Network",
    desc: "Access our network of verified delivery partners with real-time tracking and rider management.",
    features: ["Access LocalWala delivery partners", "Live delivery tracking", "Rider management", "Dedicated delivery support"],
  },
  {
    title: "Restaurant's Own Delivery Staff",
    desc: "Use your existing delivery team. Full control, lower delivery costs, familiar faces.",
    features: ["Use existing delivery boys", "Manage internal fleet", "Lower delivery costs", "Greater control"],
  },
  {
    title: "Hybrid Delivery Model",
    desc: "Combine both approaches. Use your riders during peak hours and LocalWala during surges.",
    features: ["Restaurant + LocalWala riders", "Dynamic allocation", "Improved efficiency", "Cost optimization"],
  },
];

export default function RestaurantPartnersPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    ownerName: "", mobileNumber: "", whatsappNumber: "", emailAddress: "",
    restaurantName: "", restaurantType: "",
    state: "", district: "", city: "", locality: "", landmark: "", fullAddress: "", pincode: "",
    latitude: null as number | null, longitude: null as number | null,
    primaryLocality: "", additionalLocalities: [] as string[],
    deliveryRadius: "", fssaiNumber: "", numberOfBranches: "", averageDailyOrders: "", additionalNotes: "",
    deliveryModel: "",
  });

  const [localityList, setLocalityList] = useState<string[]>([]);
  const [localityInput, setLocalityInput] = useState("");

  const updateField = (field: string, value: string | string[] | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const addLocality = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed && !localityList.includes(trimmed)) {
      const next = [...localityList, trimmed];
      setLocalityList(next);
      updateField("additionalLocalities", next);
    }
    setLocalityInput("");
  };

  const removeLocality = (loc: string) => {
    const next = localityList.filter((l) => l !== loc);
    setLocalityList(next);
    updateField("additionalLocalities", next);
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!formData.ownerName.trim()) { setError("Owner name is required"); return false; }
      if (!formData.mobileNumber.trim()) { setError("Mobile number is required"); return false; }
      if (!formData.emailAddress.trim()) { setError("Email is required"); return false; }
    }
    if (s === 2) {
      if (!formData.restaurantName.trim()) { setError("Restaurant name is required"); return false; }
      if (!formData.restaurantType) { setError("Select a restaurant type"); return false; }
      if (!formData.state) { setError("State is required"); return false; }
      if (!formData.city.trim()) { setError("City is required"); return false; }
      if (!formData.locality.trim()) { setError("Locality is required"); return false; }
      if (!formData.fullAddress.trim()) { setError("Full address is required"); return false; }
      if (!formData.pincode.trim()) { setError("Pincode is required"); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateStep(step)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/restaurant-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, submittedAt: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
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
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Application Submitted!</h2>
          <p className="text-gray-600 mb-8">Thank you! Our team will review your application and get back to you within 48 hours.</p>
          <Button onClick={() => { setSubmitted(false); setStep(1); }} size="lg">Submit Another</Button>
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
            <Badge variant="brand" className="mb-4">Restaurant Partners</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              Onboard Your <span className="text-brand-primary">Restaurant</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Lower commissions. Better tools. More customers. Grow with LocalWala Food.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="brand" className="mb-4">Why Choose LocalWala Food?</Badge>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                Built For Restaurant Growth,<br /><span className="text-brand-primary">Not Just Order Collection</span>
              </h2>
              <p className="text-lg text-gray-600">More profits, better support, lower commissions, and complete business tools under one ecosystem.</p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item) => (
              <StaggerItem key={item.label}>
                <GlassCard hover className="p-8 text-center">
                  <p className="text-4xl font-black text-brand-primary mb-2">{item.stat}</p>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Lower Commission, Higher Profits" subtitle="Transparent pricing designed for restaurant success" />
          </ScrollReveal>
          <StaggerContainer className="mt-12 grid md:grid-cols-2 gap-8">
            <StaggerItem>
              <GlassCard className="p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                    <Percent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Lower Commission Structure</h3>
                </div>
                <ul className="space-y-3">
                  {["Lower commission than market-leading platforms", "Transparent pricing — no hidden charges", "Flexible onboarding plans", "Restaurant-friendly revenue model", "Better profit margins for local businesses"].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm font-bold text-green-800">Save up to 10-15% on commission costs compared to other platforms</p>
                </div>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard className="p-8 h-full">
                <h3 className="text-xl font-black text-gray-900 mb-4">Restaurant Benefits</h3>
                <div className="grid grid-cols-2 gap-3">
                  {restaurantBenefits.map((b) => (
                    <div key={b} className="flex items-start gap-2 p-3 rounded-xl bg-gray-50">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-gray-700">{b}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Choose Your Delivery Model" subtitle="Flexible options — your restaurant, your rules" />
          </ScrollReveal>
          <StaggerContainer className="mt-12 grid md:grid-cols-3 gap-6">
            {deliveryOptions.map((opt, i) => (
              <StaggerItem key={i}>
                <GlassCard hover className="p-8 h-full">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-lg">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{opt.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{opt.desc}</p>
                  <ul className="space-y-2">
                    {opt.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <ChevronRight className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="LocalWala Ecosystem" subtitle="Everything your business needs in one platform" />
          </ScrollReveal>
          <StaggerContainer className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StaggerItem>
              <GlassCard hover className="p-6 text-center">
                <Smartphone className="mx-auto h-10 w-10 text-brand-primary mb-4" />
                <h3 className="text-base font-bold text-gray-900 mb-2">Restaurant App</h3>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {appFeatures.slice(0, 5).map((f) => <Chip key={f} label={f} />)}
                </div>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard hover className="p-6 text-center">
                <Tablet className="mx-auto h-10 w-10 text-brand-primary mb-4" />
                <h3 className="text-base font-bold text-gray-900 mb-2">Kitchen Display</h3>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {kitchenFeatures.slice(0, 5).map((f) => <Chip key={f} label={f} />)}
                </div>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard hover className="p-6 text-center">
                <Monitor className="mx-auto h-10 w-10 text-brand-primary mb-4" />
                <h3 className="text-base font-bold text-gray-900 mb-2">POS System</h3>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {posFeatures.slice(0, 5).map((f) => <Chip key={f} label={f} />)}
                </div>
              </GlassCard>
            </StaggerItem>
            <StaggerItem>
              <GlassCard hover className="p-6 text-center">
                <Truck className="mx-auto h-10 w-10 text-brand-primary mb-4" />
                <h3 className="text-base font-bold text-gray-900 mb-2">Delivery Partner App</h3>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["Accept Orders", "Navigation", "Earnings Dashboard", "Wallet", "Incentives"].map((f) => <Chip key={f} label={f} />)}
                </div>
              </GlassCard>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Onboard Your Restaurant" subtitle="Fill out the form and our team will reach out within 48 hours" />
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="mt-8">
              {error && <p className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</p>}

              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <GlassCard className="p-8 md:p-10 shadow-xl">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Owner Information</h2>
                      <p className="text-gray-500 mb-8">Tell us about yourself</p>
                      <div className="space-y-5">
                        <Input label="Owner Name" required value={formData.ownerName} onChange={(e) => updateField("ownerName", e.target.value)} placeholder="Your full name" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <Input label="Mobile Number" required value={formData.mobileNumber} onChange={(e) => updateField("mobileNumber", e.target.value)} placeholder="+91 98765 43210" />
                          <Input label="WhatsApp Number" value={formData.whatsappNumber} onChange={(e) => updateField("whatsappNumber", e.target.value)} placeholder="+91 98765 43210" />
                        </div>
                        <Input label="Email Address" type="email" required value={formData.emailAddress} onChange={(e) => updateField("emailAddress", e.target.value)} placeholder="you@example.com" />
                      </div>
                      <div className="mt-8 flex justify-end">
                        <Button type="button" onClick={() => { setError(""); if (validateStep(1)) setStep(2); }} size="lg">Continue <ChevronRight className="ml-2 h-5 w-5" /></Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <GlassCard className="p-8 md:p-10 shadow-xl">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
                      <p className="text-gray-500 mb-8">Tell us about your restaurant</p>
                      <div className="space-y-5">
                        <Input label="Restaurant Name" required value={formData.restaurantName} onChange={(e) => updateField("restaurantName", e.target.value)} placeholder="Your restaurant name" />
                        <div>
                          <label className="mb-3 block text-sm font-medium text-gray-700">Restaurant Type <span className="text-brand-primary">*</span></label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {restaurantTypes.map((type) => (
                              <motion.button key={type.value} type="button" whileTap={{ scale: 0.97 }}
                                onClick={() => updateField("restaurantType", type.value)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${formData.restaurantType === type.value ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200"}`}>
                                <span className="text-sm font-semibold text-gray-900">{type.label}</span>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">State *</label>
                            <select className="w-full h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                              value={formData.state} onChange={(e) => { updateField("state", e.target.value); updateField("city", ""); setLocalityList([]); }}>
                              <option value="">Select State</option>
                              {Object.keys(statesData).map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <Input label="District" value={formData.district} onChange={(e) => updateField("district", e.target.value)} placeholder="District" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">City *</label>
                            <select className="w-full h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                              value={formData.city} onChange={(e) => { updateField("city", e.target.value); setLocalityList([]); }} disabled={!formData.state}>
                              <option value="">{formData.state ? "Select City" : "Select State First"}</option>
                              {(statesData[formData.state] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Locality *</label>
                            <select className="w-full h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                              value={formData.locality} onChange={(e) => updateField("locality", e.target.value)} disabled={!formData.city}>
                              <option value="">{formData.city ? "Select Locality" : "Select City First"}</option>
                              {(localitiesData[formData.city] || Object.values(localitiesData).flat()).map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                        </div>
                        <Input label="Landmark" value={formData.landmark} onChange={(e) => updateField("landmark", e.target.value)} placeholder="Near landmark" />
                        <Textarea label="Full Address" required value={formData.fullAddress} onChange={(e) => updateField("fullAddress", e.target.value)} placeholder="Complete address" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <Input label="Pincode" required value={formData.pincode} onChange={(e) => updateField("pincode", e.target.value)} placeholder="500001" />
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">GPS Coordinates</label>
                            <button type="button" onClick={() => {
                              navigator.geolocation?.getCurrentPosition(
                                (pos) => { updateField("latitude", pos.coords.latitude); updateField("longitude", pos.coords.longitude); },
                                () => {}
                              );
                            }} className="w-full h-11 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-brand-primary hover:text-brand-primary transition-colors">
                              <MapPin className="h-4 w-4" />
                              {formData.latitude !== null ? `${formData.latitude?.toFixed(4)}, ${formData.longitude?.toFixed(4)}` : "Auto Detect Location"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-8 flex gap-3 justify-between">
                        <Button type="button" variant="outline" onClick={() => { setError(""); setStep(1); }} size="lg">Back</Button>
                        <Button type="button" onClick={() => { setError(""); if (validateStep(2)) setStep(3); }} size="lg">Continue <ChevronRight className="ml-2 h-5 w-5" /></Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <GlassCard className="p-8 md:p-10 shadow-xl">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Details</h2>
                      <p className="text-gray-500 mb-8">Additional information about your service area</p>
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Preferred Delivery Model</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {["LocalWala Network", "Own Delivery Staff", "Hybrid"].map((m) => (
                              <motion.button key={m} type="button" whileTap={{ scale: 0.97 }}
                                onClick={() => updateField("deliveryModel", m)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${formData.deliveryModel === m ? "border-brand-primary bg-brand-light shadow-md" : "border-gray-200"}`}>
                                <span className="text-sm font-semibold text-gray-900">{m}</span>
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        <Input label="Primary Locality" value={formData.primaryLocality} onChange={(e) => updateField("primaryLocality", e.target.value)} placeholder="e.g., Benz Circle" />
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Additional Localities</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={localityInput} onChange={(e) => setLocalityInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocality(localityInput); } }}
                              placeholder="Type locality and press Enter..."
                              className="w-full h-11 rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
                            {(formData.city ? statesData[formData.state] || Object.keys(statesData) : Object.values(statesData).flat()).length > 0 && localityInput.length >= 1 && (
                              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto">
                                {Object.values(localitiesData).flat()
                                  .filter((l) => l.toLowerCase().includes(localityInput.toLowerCase()) && !localityList.includes(l))
                                  .map((loc) => (
                                    <button key={loc} type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand-primary"
                                      onClick={() => addLocality(loc)}>
                                      <MapPin className="inline h-3.5 w-3.5 mr-2 text-gray-400" />{loc}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {localityList.map((loc) => <Chip key={loc} label={loc} onRemove={() => removeLocality(loc)} />)}
                          </div>
                        </div>

                        <Input label="Delivery Radius" placeholder="e.g., 5 km" value={formData.deliveryRadius} onChange={(e) => updateField("deliveryRadius", e.target.value)} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <Input label="FSSAI Number" value={formData.fssaiNumber} onChange={(e) => updateField("fssaiNumber", e.target.value)} placeholder="Optional" />
                          <Input label="Number of Branches" value={formData.numberOfBranches} onChange={(e) => updateField("numberOfBranches", e.target.value)} placeholder="e.g., 1" />
                        </div>
                        <Input label="Average Daily Orders" value={formData.averageDailyOrders} onChange={(e) => updateField("averageDailyOrders", e.target.value)} placeholder="e.g., 100" />
                        <Textarea label="Additional Notes" value={formData.additionalNotes} onChange={(e) => updateField("additionalNotes", e.target.value)} placeholder="Any additional information..." />
                      </div>
                      <div className="mt-8 flex gap-3 justify-between">
                        <Button type="button" variant="outline" onClick={() => { setError(""); setStep(2); }} size="lg">Back</Button>
                        <Button type="submit" isLoading={submitting} size="lg" className="shadow-xl">Submit Application</Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </form>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
