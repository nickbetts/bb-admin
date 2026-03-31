import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout requiredPermission="users">{children}</AuthenticatedLayout>;
}
