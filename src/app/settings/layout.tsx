import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout requiredPermission="settings">{children}</AuthenticatedLayout>;
}
