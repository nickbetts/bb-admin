import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function MeridianArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLayout uiVariant="enhanced" requiredPermission="meridian_architecture">
      {children}
    </AuthenticatedLayout>
  );
}
