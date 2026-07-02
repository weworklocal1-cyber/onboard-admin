"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Award,
  Users,
  Rocket,
  GraduationCap,
  Briefcase,
  Globe,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import ThreeScene from "@/components/three/ThreeScene";
import { CinematicText } from "@/components/animations/cinematic-text";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/animations/scroll-reveal";

interface Course {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  passing_score: number;
}

const heroStats = [
  { label: "Internship Track", value: "Mobile App Dev", icon: Smartphone },
  { label: "Platform", value: "Flutter", icon: Rocket },
  { label: "Certificate", value: "QR Verified", icon: Award },
  { label: "Access", value: "Free", icon: Users },
];

export default function AcademyLandingPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({ students: 0, courses: 0, certificates: 0, companies: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: coursesData } = await supabase
        .from("academy_courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      setCourses(coursesData || []);

      const { count: studentCount } = await supabase
        .from("academy_enrollments")
        .select("user_id", { count: "exact", head: true });

      const { count: certCount } = await supabase
        .from("academy_certificates")
        .select("certificate_id", { count: "exact", head: true });

      setStats({
        students: studentCount || 0,
        courses: coursesData?.length || 0,
        certificates: certCount || 0,
        companies: 1,
      });
    };
    fetchData();
  }, [supabase]);

  return (
    <div className="min-h-screen">
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <ThreeScene />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-academy-primary/70 to-academy-secondary" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6"
              >
                <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  WeWorkLocal Academy
                </Badge>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                <CinematicText text="Learn. Certify." className="block" />
                <span className="block text-white/90 mt-1">
                  <CinematicText text="Mobile App" />
                </span>
                <span className="block text-white mt-1">
                  <CinematicText text="Internship." />
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-6 text-lg text-white/80 leading-relaxed max-w-lg"
              >
                Master local commerce fundamentals and earn a certificate that qualifies you for the
                Mobile Application Development internship at LocalWala.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link href="/academy/courses">
                  <Button size="lg" className="text-base px-8 shadow-xl hover:shadow-2xl bg-white text-academy-primary hover:bg-white/90">
                    Browse Certifications
                  </Button>
                </Link>
                <Link href="/academy/register">
                  <Button size="lg" variant="outline" className="text-base px-8 border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm">
                    Get Started Free
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-8 flex items-center gap-6 text-sm text-white/70"
              >
                <span>Learn at your own pace</span>
                <span>Certificate included</span>
              </motion.div>
            </div>

            <div className="hidden lg:block">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                <GlassCard className="p-8 max-w-md ml-auto bg-white/10 border-white/20 backdrop-blur-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white shadow-lg">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Internship Track</h3>
                      <p className="text-sm text-white/70">Mobile Application Development</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">Stack Focus</span>
                      <span className="text-2xl font-black text-white">Flutter</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "78%" }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-white rounded-full"
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-white/70">Outcome</span>
                      <span className="text-sm font-semibold text-green-300">Full-Time Role</span>
                    </div>
                  </div>
                </GlassCard>

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-4 -bottom-4"
                >
                  <GlassCard className="p-4 shadow-xl bg-white/10 border-white/20 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🚀</div>
                      <div>
                        <p className="text-sm font-bold text-white">New Internship Batch</p>
                        <p className="text-xs text-white/70">Applications open now</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              </motion.div>
            </div>
          </div>

          <ScrollReveal className="mt-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {heroStats.map((stat, i) => (
                <GlassCard key={i} className="p-6 text-center bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15">
                  <stat.icon className="mx-auto h-8 w-8 text-white mb-3" />
                  <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                  <p className="text-xs md:text-sm text-white/80 mt-1 font-medium">{stat.label}</p>
                </GlassCard>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <SectionHeading
              label="Why Academy"
              title="Built for Aspiring Mobile App Developers"
              subtitle="Real-world local commerce training, not just theory"
            />
          </ScrollReveal>

          <StaggerContainer className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Industry Curriculum",
                desc: "Real-world local commerce scenarios with hands-on exercises.",
              },
              {
                icon: Award,
                title: "Verified Certificate",
                desc: "Earn a QR-verified certificate upon passing the final assessment.",
              },
              {
                icon: Briefcase,
                title: "Internship Pathway",
                desc: "Score above 68% and qualify for the Mobile Application Development internship.",
              },
              {
                icon: Users,
                title: "Community",
                desc: "Learn alongside other aspiring developers and mentors.",
              },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <GlassCard hover className="p-8 h-full text-center bg-white border border-gray-100">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-academy-light flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-academy-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <SectionHeading
              label="How It Works"
              title="Four Steps to Your Internship"
              subtitle="From enrollment to internship offer"
            />
          </ScrollReveal>

          <StaggerContainer className="mt-16 grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Enroll Free", desc: "Create an account and enroll in the certification course.", icon: Users },
              { step: "02", title: "Learn", desc: "Complete interactive modules at your own pace.", icon: BookOpen },
              { step: "03", title: "Certify", desc: "Pass the final assessment with above 68%.", icon: Award },
              { step: "04", title: "Intern", desc: "Apply for the Mobile Application Development internship.", icon: Rocket },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div className="relative">
                  <GlassCard hover className="p-6 h-full text-center bg-white border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-academy-primary text-white flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-academy-light flex items-center justify-center mx-auto mb-4 text-academy-primary">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </GlassCard>
                  {i < 3 && (
                    <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ChevronRight className="h-6 w-6 text-academy-primary" />
                    </div>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <SectionHeading
              label="About LocalWala"
              title="The Platform & The Internship"
              subtitle="Join India's most trusted local commerce platform"
            />
          </ScrollReveal>

          <StaggerContainer className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: "What We Do",
                desc: "LocalWala connects local restaurants, cafes, cloud kitchens, and food trucks with customers through a powerful delivery network built on cutting-edge technology.",
              },
              {
                icon: Rocket,
                title: "What You'll Build",
                desc: "Work on real mobile applications that serve thousands of customers. Build features, solve problems, and ship code that makes a real impact on local businesses.",
              },
              {
                icon: Briefcase,
                title: "What You'll Gain",
                desc: "Professional experience, mentorship from industry experts, and a strong portfolio. Top performers receive full-time job offers and competitive stipends.",
              },
              {
                icon: Smartphone,
                title: "Flutter Frontend",
                desc: "Build cross-platform mobile apps using Flutter and Dart. Deliver consistent, high-performance experiences for both Android and iOS users.",
              },
              {
                icon: Users,
                title: "Real Projects",
                desc: "Contribute to production-grade features like order tracking, restaurant onboarding, delivery workflows, and customer-facing dashboards.",
              },
              {
                icon: Award,
                title: "Career Growth",
                desc: "This is not just an internship. It is a structured path to a full-time Mobile Application Development role at LocalWala for top performers.",
              },
              {
                icon: Rocket,
                title: "Mobile Application Development",
                desc: "Work on the LocalWala customer and partner apps built with Flutter. Implement UI screens, integrate APIs, manage state with Provider or Riverpod, and publish releases.",
              },
              {
                icon: BookOpen,
                title: "App Ecosystem",
                desc: "LocalWala includes customer ordering, restaurant management, delivery partner tracking, and admin dashboards. Learn how these modules connect in a real product ecosystem.",
              },
              {
                icon: Users,
                title: "Mentorship & Teams",
                desc: "Join a focused mobile engineering team. Get code reviews, pair programming sessions, and guidance from engineers shipping Flutter apps in production.",
              },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <GlassCard hover className="p-6 h-full bg-white border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-academy-light flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-academy-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <SectionHeading
              label="Courses"
              title="Certification Programs"
              subtitle="Designed for real careers in mobile application development"
            />
          </ScrollReveal>

          <StaggerContainer className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <StaggerItem key={course.id}>
                <GlassCard hover className="h-full bg-white border border-gray-100 overflow-hidden">
                  <div className="h-48 bg-gradient-to-br from-academy-primary to-academy-secondary relative">
                    <Badge className="absolute top-3 right-3 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Award className="h-3 w-3 mr-1" />
                      Certificate
                    </Badge>
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-16 w-16 text-white/30" />
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold text-gray-900">{course.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{course.duration_minutes} min</span>
                      <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
                    </div>
                    <Link href={`/academy/courses/${course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}>
                      <Button className="w-full bg-academy-primary hover:bg-academy-secondary text-white">
                        View Course
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              </StaggerItem>
            ))}
            {courses.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                Courses coming soon. Check back soon for new certification programs.
              </div>
            )}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <SectionHeading
              label="Get Started"
              title="Ready to Start Your Journey?"
              subtitle="Join aspiring mobile app developers and earn your certification"
            />
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              <Link href="/academy/courses">
                <Button size="lg" className="text-base px-8 shadow-xl hover:shadow-2xl bg-academy-primary hover:bg-academy-secondary text-white">
                  Browse Certifications
                </Button>
              </Link>
              <Link href="/academy/register">
                <Button size="lg" variant="outline" className="text-base px-8 border-academy-primary text-academy-primary hover:bg-academy-light bg-white">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
