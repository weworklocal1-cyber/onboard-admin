import WorkforceLayout from "@/components/layout/workforce-layout";

export const metadata = {
  title: "Workforce Hub",
  description: "LocalWala Workforce Hub - Internal Operations Platform",
};

export default function WorkforceRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkforceLayout>{children}</WorkforceLayout>;
}