import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteLayout from "@/components/layout/site-layout";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.localwala.tech"),
  title: {
    default: "LocalWala Food - Delivering Local. Empowering Businesses.",
    template: "%s | LocalWala Food",
  },
  description:
    "LocalWala Food is a premium technology platform connecting local restaurants, cafes, cloud kitchens, and food trucks with customers through a powerful delivery network. Join our ecosystem today.",
  keywords: [
    "LocalWala Food",
    "food delivery",
    "restaurant partners",
    "delivery partners",
    "cloud kitchens",
    "food trucks",
    "local commerce",
    "food technology",
    "India food delivery",
  ],
  authors: [{ name: "LocalWala Food" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://localwalafood.com",
    siteName: "LocalWala Food",
    title: "LocalWala Food - Delivering Local. Empowering Businesses.",
    description:
      "Premium technology platform for local commerce. Onboard your restaurant or join our delivery network.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LocalWala Food",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalWala Food",
    description: "Delivering Local. Empowering Businesses.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-white text-gray-900">
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}