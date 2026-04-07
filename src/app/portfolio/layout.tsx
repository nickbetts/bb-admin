import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
