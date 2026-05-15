import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout uiVariant="enhanced">{children}</AuthenticatedLayout>;
}
