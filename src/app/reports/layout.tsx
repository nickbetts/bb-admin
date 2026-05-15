import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout uiVariant="classic">{children}</AuthenticatedLayout>;
}
