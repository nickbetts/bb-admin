import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requireAnyOf?: string[];
}

export async function AuthenticatedLayout({
  children,
  requiredPermission,
  requireAnyOf,
}: AuthenticatedLayoutProps) {
  const effective = await getEffectiveSession();
  if (!effective) redirect("/login");
  const { session, effectivePermissions, isAdmin, previewRoleId, previewRoleName } = effective;
  if (session.user.mustChangePassword) redirect("/change-password");

  if (requiredPermission && !effectivePermissions.includes(requiredPermission)) {
    redirect("/dashboard");
  }
  if (requireAnyOf && !requireAnyOf.some((p) => effectivePermissions.includes(p))) {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={{ name: session.user.name, email: session.user.email }}
        permissions={effectivePermissions}
        isAdmin={isAdmin}
        previewRoleId={previewRoleId}
        previewRoleName={previewRoleName}
      />
      <main id="main-content" className="app-main">{children}</main>
    </div>
  );
}
