import { Metadata } from "next";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Privacy Policy – LocalWala",
  description: "Learn how LocalWala collects, uses, and protects your personal information. We are committed to protecting your privacy and data security.",
  openGraph: {
    title: "Privacy Policy – LocalWala",
    description: "Learn how LocalWala handles your personal data responsibly.",
  },
};

export default function PrivacyPolicyPage() {
  const sections = [
    { id: "introduction", title: "Introduction", content: "Welcome to LocalWala. We are committed to protecting your privacy and handling your personal information responsibly. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information." },
    { id: "information-collect", title: "Information We Collect", items: [
      "Name – Used to personalize your experience",
      "Mobile Number – For order updates and account verification",
      "Email Address – For newsletters, offers, and account management",
      "Password (encrypted) – Securely stored for account protection",
      "Location Information – To find nearby restaurants and delivery partners",
      "Device Information – Technical details to improve app performance",
      "Vendor/Business Information – For restaurant partners and delivery executives",
    ]},
    { id: "how-use", title: "How We Use Information", items: [
      "To provide and improve our services",
      "To process orders and payments",
      "To communicate with you about updates",
      "To personalize your experience",
      "To ensure security and prevent fraud",
    ]},
    { id: "information-sharing", title: "Information Sharing", content: "LocalWala does not sell personal information. We only share data with trusted partners necessary to provide our services, or when required by law." },
    { id: "data-security", title: "Data Security", content: "We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your information." },
    { id: "data-retention", title: "Data Retention", content: "We retain your information for as long as necessary to provide our services and comply with legal obligations." },
    { id: "user-rights", title: "User Rights", content: "You have the right to access, correct, or delete your personal information. You can request these changes through your account settings or by contacting us." },
    { id: "account-deletion", title: "Account Deletion", content: "Users can request deletion through the Delete Account page. We will process your request within 7 business days while retaining necessary data for legal compliance." },
    { id: "childrens-privacy", title: "Children's Privacy", content: "Our services are not intended for children under 13. We do not knowingly collect personal information from children." },
    { id: "changes", title: "Changes To Policy", content: "We may update this policy. Changes will be posted on this page with an updated effective date." },
    { id: "contact", title: "Contact Information", content: "For questions about this privacy policy, contact us at support@localwala.tech" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="pt-28 pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <Badge variant="brand" className="mb-6">Legal</Badge>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Last updated: June 2026
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          {sections.map((section, idx) => (
            <ScrollReveal key={section.id} delay={idx * 0.05}>
              <GlassCard className="p-8 md:p-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4" id={section.id}>
                  {section.title}
                </h2>
                {section.items ? (
                  <ul className="space-y-3">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-brand-primary font-bold">•</span>
                        <span className="text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 leading-relaxed">{section.content}</p>
                )}
                {section.id === "introduction" && (
                  <p className="mt-4 text-sm text-gray-500">
                    <strong>Important:</strong> LocalWala does not sell personal information.
                    Users can request deletion through the Delete Account page.
                  </p>
                )}
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="pb-24 gradient-subtle">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <GlassCard className="p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Need More Information?</h2>
              <p className="text-gray-600 mb-4">
                Contact our support team for any privacy-related questions
              </p>
              <a href="mailto:support@localwala.tech" className="text-brand-primary font-semibold hover:underline">
                support@localwala.tech
              </a>
            </GlassCard>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}