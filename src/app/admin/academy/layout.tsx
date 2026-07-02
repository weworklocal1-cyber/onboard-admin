import AcademyAdminLayout from "@/components/layout/academy-admin-layout";
import AdminAuthGuard from "@/components/auth/admin-auth-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AcademyAdminLayout>{children}</AcademyAdminLayout>
    </AdminAuthGuard>
  );
}
