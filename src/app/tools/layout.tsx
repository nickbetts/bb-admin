import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const toolPermissions = ["page_analyser", "proposal_generator", "proposals", "pricing", "llm_generator"];
  const hasAnyTool = toolPermissions.some((p) => session.user.permissions.includes(p));
  if (!hasAnyTool) redirect("/dashboard");

  return (
    <div className="app-shell">
      <Sidebar user={{ name: session.user.name, email: session.user.email }} permissions={session.user.permissions} />
      <main className="app-main">{children}</main>
    </div>
  );
}
