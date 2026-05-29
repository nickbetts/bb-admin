import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminAICostsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">AI Costs</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Track OpenAI/Anthropic usage and costs
        </p>
      </div>
      <AdminNav active="ai-costs" permissions={session.user.permissions} />
      {children}
    </div>
  );
}
