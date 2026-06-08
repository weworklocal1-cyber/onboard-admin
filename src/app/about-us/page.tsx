"use client";

import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { GlassCard } from "@/components/ui/glass-card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Heart, Lightbulb, Rocket, Users, Globe, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StaggerContainer, StaggerItem } from "@/components/animations/scroll-reveal";

const timelineItems = [
  { year: "2024", title: "The Beginning", desc: "Founded with a vision to empower local restaurants. Started with 50 restaurant partners in Vijayawada." },
  { year: "2025", title: "Rapid Expansion", desc: "Grew to 2,000+ partners across Andhra Pradesh and Telangana. Launched delivery partner program." },
  { year: "2026", title: "Going Big", desc: "Expanded to 5,000+ partners. Planning pan-India expansion with technology-led growth." },
  { year: "Future", title: "The Vision", desc: "Become India's most trusted local commerce platform. Empower 1 million+ local businesses." },
];

const values = [
  { icon: Heart, title: "Community First", desc: "We put local businesses and their communities at the heart of everything we do." },
  { icon: Lightbulb, title: "Innovation", desc: "Leveraging cutting-edge technology to solve real-world problems for local merchants." },
  { icon: Users, title: "Trust", desc: "Building lasting relationships based on transparency, reliability, and mutual growth." },
  { icon: Globe, title: "Scalability", desc: "Designed to scale from neighbourhood to nation, empowering businesses everywhere." },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen">
      <section className="relative pt-28 pb-20 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl">
              <Badge variant="brand" className="mb-6">About Us</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
                Building the Future of <span className="text-brand-primary">Local Commerce</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                LocalWala Food was born from a simple belief: every local restaurant deserves
                the same technology and reach as the biggest chains. We&apos;re on a mission to
                democratize food delivery across India.
              </p>
            </div>
          </ScrollReveal>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-light/30 to-transparent -z-10" />
      </section>

      <section className="py-24 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Our Mission & Vision" subtitle="What drives us every day" />
          </ScrollReveal>
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <ScrollReveal delay={0.1}>
              <GlassCard hover className="p-10">
                <div className="w-14 h-14 rounded-2xl gradient-primary shadow-lg flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Our Mission</h3>
                <p className="text-gray-600 leading-relaxed">
                  To empower every local food business in India with world-class technology,
                  enabling them to reach more customers, grow their revenue, and build sustainable
                  businesses that support their families and communities.
                </p>
              </GlassCard>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <GlassCard hover className="p-10">
                <div className="w-14 h-14 rounded-2xl gradient-primary shadow-lg flex items-center justify-center mb-6">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Our Vision</h3>
                <p className="text-gray-600 leading-relaxed">
                  To become India&apos;s most trusted and beloved local commerce platform, connecting
                  millions of merchants with customers, creating economic opportunities for
                  delivery partners, and enabling joyful food experiences for everyone.
                </p>
              </GlassCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Our Journey" subtitle="From a small idea to a growing movement" />
          </ScrollReveal>

          <div className="mt-16 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 hidden md:block" />
            <div className="space-y-16">
              {timelineItems.map((item, i) => (
                <ScrollReveal key={i}>
                  <div className={`relative flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                    <div className="flex-1">
                      <GlassCard className={`p-8 ${i % 2 === 0 ? "md:mr-8" : "md:ml-8"}`}>
                        <span className="text-sm font-bold text-brand-primary">{item.year}</span>
                        <h3 className="text-xl font-black text-gray-900 mt-1 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                      </GlassCard>
                    </div>
                    <div className="hidden md:flex h-4 w-4 rounded-full gradient-primary shadow-lg border-4 border-white z-10" />
                    <div className="flex-1 hidden md:block" />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading title="Our Core Values" subtitle="The principles that guide everything we do" />
          </ScrollReveal>
          <StaggerContainer className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <StaggerItem key={i}>
                <GlassCard hover className="p-8 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary shadow-lg flex items-center justify-center mb-5">
                    <value.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{value.desc}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <Badge variant="brand" className="mb-4">Founder Message</Badge>
            <h2 className="text-3xl font-black text-gray-900 mb-6">A Note From Our Founder</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <GlassCard className="p-10 md:p-14">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-5xl mb-6"
              >
                “
              </motion.div>
              <blockquote className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-8 font-medium italic">
                Every local restaurant has a story worth sharing. Our job is to make sure
                that story reaches as many people as possible. LocalWala Food isn&apos;t just a
                platform — it&apos;s a movement to put local businesses back at the heart of our
                communities.
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">MCT</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Mandava Charan Teja</p>
                  <p className="text-sm text-gray-500">CEO & Founder, LocalWala Food</p>
                </div>
              </div>
            </GlassCard>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-24 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
              Ready to Join the Movement?
            </h2>
            <p className="text-lg text-white/90 mb-10">
              Whether you&apos;re a restaurant owner, delivery partner, or looking to grow your career —
              we have a place for you.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/restaurant-partners">
                <Button size="lg" variant="secondary" className="shadow-xl">
                  Onboard Restaurant <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/careers">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  View Careers
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
