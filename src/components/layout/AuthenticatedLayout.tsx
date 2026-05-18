import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { ConnectionStatusBanner } from "@/components/layout/ConnectionStatusBanner";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requireAnyOf?: string[];
  uiVariant?: "classic" | "enhanced";
}

export async function AuthenticatedLayout({
  children,
  requiredPermission,
  requireAnyOf,
  uiVariant = "classic",
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

  const useEnhancedShell = uiVariant === "enhanced";

  return (
    <div className={cn("app-shell", useEnhancedShell && "app-shell-enhanced")}>
      <Sidebar
        user={{ name: session.user.name, email: session.user.email }}
        permissions={effectivePermissions}
        isAdmin={isAdmin}
        previewRoleId={previewRoleId}
        previewRoleName={previewRoleName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectionStatusBanner />
        <main id="main-content" className={cn("app-main", useEnhancedShell && "app-main-enhanced")}>
          {children}
        </main>
      </div>
    </div>
  );
}
