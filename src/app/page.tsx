"use client";

import ThreeScene from "@/components/three/ThreeScene";
import { motion } from "framer-motion";
import { CinematicText } from "@/components/animations/cinematic-text";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/animations/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  MapPin,
  Award,
  Shield,
  Zap,
  ChevronRight,
  Star,
  Globe,
  Smartphone,
  BarChart3,
  HeadphonesIcon,
  Truck,
  Store,
} from "lucide-react";

const stats = [
  { label: "Cities Launching", value: "5+", icon: Globe },
  { label: "Restaurants Onboarding", value: "Now", icon: Store },
  { label: "Delivery Network", value: "Building", icon: Truck },
  { label: "Orders Target", value: "Scaling", icon: TrendingUp },
];

const features = [
  {
    title: "Grow Your Restaurant",
    description:
      "Reach more customers, increase daily orders, and expand your business with our powerful platform.",
    icon: Store,
    href: "/restaurant-partners",
  },
  {
    title: "Join Delivery Network",
    description:
      "Earn competitive rates with flexible hours. Be your own boss with our delivery partner program.",
    icon: Truck,
    href: "/delivery-partners",
  },
  {
    title: "Build Your Career",
    description:
      "Join a fast-growing team and help shape the future of local commerce in India.",
    icon: Users,
    href: "/careers",
  },
  {
    title: "Premium Technology",
    description:
      "State-of-the-art logistics, real-time tracking, and smart analytics for your business.",
    icon: Zap,
    href: "/about-us",
  },
];

export default function Home() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <ThreeScene />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/60 to-gray-900" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6"
              >
                <Badge variant="brand" className="mb-4 bg-white/10 text-brand-primary border-brand-primary/30">
                  🚀 India&apos;s Fastest Growing Local Commerce Platform
                </Badge>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                <CinematicText text="Delivering Local." className="block" />
                <span className="block text-brand-primary mt-1">
                  <CinematicText text="Empowering Businesses." />
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-6 text-lg text-gray-300 leading-relaxed max-w-lg"
              >
                LocalWala Food connects local restaurants, cafes, and food
                businesses with hungry customers through our premium delivery
                network. Scale your business, reach more customers, and grow
                faster.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link href="/restaurant-partners">
                  <Button size="lg" className="text-base px-8 shadow-xl hover:shadow-2xl">
                    Onboard Your Restaurant
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/about-us">
                  <Button variant="outline" size="lg" className="text-base px-8 border-white/30 text-white hover:bg-white/10">
                    Learn More
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-10 flex items-center gap-3"
              >
                <div className="flex -space-x-2">
                  {["⭐", "🌟", "⭐"].map((emoji, i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 shadow-md text-sm border-2 border-gray-700"
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                     Trusted by Growing Partner Network
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="hidden lg:block">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                <div className="relative">
                   <GlassCard className="p-8 max-w-md ml-auto">
                     <div className="flex items-center gap-4 mb-6">
                       <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-lg">
                         <Store className="h-6 w-6 text-white" />
                       </div>
                       <div>
                         <h3 className="font-bold text-gray-900">Partner Dashboard</h3>
                         <p className="text-sm text-gray-500">Early Growth Phase</p>
                       </div>
                     </div>
                     <div className="space-y-4">
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-500">This Month&apos;s Orders</span>
                         <span className="text-2xl font-black text-brand-primary">Growing</span>
                       </div>
                       <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: "45%" }}
                           transition={{ duration: 1.5, delay: 0.5 }}
                           className="h-full gradient-primary rounded-full"
                         />
                       </div>
                       <div className="flex justify-between">
                         <span className="text-sm text-gray-500">Onboarding Phase</span>
                         <span className="text-sm font-semibold text-green-600">Active</span>
                       </div>
                     </div>
                   </GlassCard>

                   <motion.div
                     animate={{ y: [0, -10, 0] }}
                     transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -right-4 -bottom-4"
                   >
                     <GlassCard className="p-4 shadow-xl">
                       <div className="flex items-center gap-3">
                         <div className="text-3xl">🛵</div>
                         <div>
                           <p className="text-sm font-bold text-gray-900">New Partner Onboarded!</p>
                           <p className="text-xs text-gray-500">Just now</p>
                         </div>
                       </div>
                     </GlassCard>
                   </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="mt-20">
            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                  <GlassCard key={i} className="p-6 text-center hover:shadow-xl transition-shadow">
                    <stat.icon className="mx-auto h-8 w-8 text-brand-primary mb-3" />
                    <p className="text-3xl md:text-4xl font-black text-gray-900">{stat.value}</p>
                    <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">{stat.label}</p>
                  </GlassCard>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Ecosystem"
            title="Everything You Need to Succeed"
            subtitle="A complete platform designed to help local businesses thrive in the digital economy"
          />

          <StaggerContainer className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <StaggerItem key={i}>
                <Link href={feature.href}>
                  <GlassCard hover className="p-8 h-full group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg mb-6 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary group-hover:gap-2 transition-all">
                      Learn More <ChevronRight className="h-4 w-4" />
                    </span>
                  </GlassCard>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <Badge variant="brand" className="mb-6">Why LocalWala Food?</Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
              Built for Speed. <br />
              <span className="text-brand-primary">Designed for Growth.</span>
            </h2>
            <p className="text-lg text-gray-600 mb-12">
              Our platform provides every tool you need to run a successful food business
              in today&apos;s competitive market.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: "🚀",
                title: "Lightning Fast",
                desc: "Optimized for speed. Get your orders dispatched within minutes.",
              },
              {
                icon: "📊",
                title: "Smart Analytics",
                desc: "Real-time dashboards and insights to grow your revenue.",
              },
              {
                icon: "🔒",
                title: "Secure Payments",
                desc: "Instant payouts with bank-grade security for all transactions.",
              },
              {
                icon: "🌐",
                title: "Wide Reach",
                desc: "Access thousands of customers across multiple cities.",
              },
              {
                icon: "📱",
                title: "Easy to Use",
                desc: "Intuitive mobile app for managing orders on the go.",
              },
              {
                icon: "🎯",
                title: "Targeted Marketing",
                desc: "Built-in marketing tools to help you reach the right audience.",
              },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <GlassCard hover className="p-8 h-full">
                  <span className="text-4xl mb-4 block">{item.icon}</span>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <SectionHeading
              label="How It Works"
              title="Simple Steps to Get Started"
              subtitle="Start growing your business in minutes"
            />
          </ScrollReveal>

          <StaggerContainer className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Apply Online", desc: "Fill out the onboarding form with your restaurant details." },
              { step: "02", title: "Quick Verification", desc: "Our team reviews your application within 24-48 hours." },
              { step: "03", title: "Go Live", desc: "Start receiving orders and grow your business." },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div className="relative">
                  <div className="text-7xl font-black text-brand-light mb-4">{item.step}</div>
                  <GlassCard hover className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </GlassCard>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ChevronRight className="h-6 w-6 text-brand-primary" />
                    </div>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              Ready to Grow Your Business?
            </h2>
            <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
              Join 5000+ restaurant partners already growing with LocalWala Food.
              Start your onboarding today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/restaurant-partners">
                <Button size="lg" variant="secondary" className="text-base px-8 shadow-xl">
                  Onboard as Restaurant
                </Button>
              </Link>
              <Link href="/delivery-partners">
                <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Join as Delivery Partner
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
