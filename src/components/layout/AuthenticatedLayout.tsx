import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { prisma } from "@/lib/prisma";

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
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  // Role preview — only available to admins (users permission)
  let previewRoleId: string | null = null;
  let previewRoleName: string | null = null;
  let effectivePermissions = session.user.permissions;
  const isAdmin = session.user.permissions.includes("users");

  if (isAdmin) {
    const cookieStore = await cookies();
    const previewId = cookieStore.get("preview_role_id")?.value;
    if (previewId) {
      const previewRole = await prisma.role.findUnique({
        where: { id: previewId },
        select: { id: true, name: true, permissions: true },
      });
      if (previewRole) {
        previewRoleId = previewRole.id;
        previewRoleName = previewRole.name;
        try {
          effectivePermissions = JSON.parse(previewRole.permissions) as string[];
        } catch {
          effectivePermissions = [];
        }
      }
    }
  }

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
      <main className="app-main">{children}</main>
    </div>
  );
}
