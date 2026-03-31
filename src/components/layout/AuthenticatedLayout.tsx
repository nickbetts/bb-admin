import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
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
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  if (requiredPermission && !session.user.permissions.includes(requiredPermission)) {
    redirect("/dashboard");
  }
  if (requireAnyOf && !requireAnyOf.some((p) => session.user.permissions.includes(p))) {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={{ name: session.user.name, email: session.user.email }}
        permissions={session.user.permissions}
      />
      <main className="app-main">{children}</main>
    </div>
  );
}
