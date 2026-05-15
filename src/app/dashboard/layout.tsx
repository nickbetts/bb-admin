import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout uiVariant="enhanced">{children}</AuthenticatedLayout>;
}
