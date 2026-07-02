import type { Metadata } from "next";
import AcademyLayout from "@/components/layout/academy-layout";

export const metadata: Metadata = {
  title: {
    default: "WeWorkLocal Academy",
    template: "%s | WeWorkLocal Academy",
  },
  description:
    "Join WeWorkLocal Academy to learn local commerce, earn verified certificates, and qualify for the Mobile Application Development internship at LocalWala.",
  keywords: [
    "WeWorkLocal Academy",
    "LocalWala internship",
    "Mobile Application Development",
    "Flutter internship",
    "certification course",
    "local commerce",
    "learn Flutter",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://localwala.tech/academy",
    siteName: "WeWorkLocal Academy",
    title: "WeWorkLocal Academy - Learn. Certify. Internship.",
    description:
      "Master local commerce fundamentals, earn a verified certificate, and qualify for the Mobile Application Development internship at LocalWala.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WeWorkLocal Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WeWorkLocal Academy",
    description: "Learn. Certify. Internship. Join the LocalWala Academy today.",
    images: ["/og-image.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AcademyLayout>{children}</AcademyLayout>;
}
