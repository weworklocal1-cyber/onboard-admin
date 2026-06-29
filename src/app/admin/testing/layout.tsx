import TestingAdminLayout from "@/components/layout/testing-admin-layout";

export const metadata = {
  title: "Testing Admin",
  description: "LocalWala Testing Admin Panel",
};

export default function TestingRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <TestingAdminLayout>{children}</TestingAdminLayout>;
}