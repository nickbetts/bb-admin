import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function MeridianArchitectureLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout requiredPermission="meridian_architecture">{children}</AuthenticatedLayout>;
}
