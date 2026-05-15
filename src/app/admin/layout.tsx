import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout uiVariant="enhanced" requiredPermission="users">
      {children}
    </AuthenticatedLayout>
  );
}
