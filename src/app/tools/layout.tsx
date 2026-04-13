import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout requireAnyOf={["page_analyser", "proposal_generator", "proposals", "pricing", "llm_generator", "content_strategy", "access_requester"]}>
      {children}
    </AuthenticatedLayout>
  );
}
