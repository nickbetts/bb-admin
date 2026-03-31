import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
