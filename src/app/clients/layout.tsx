import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <Sidebar user={{ name: session.user.name, email: session.user.email, role: session.user.role }} />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
