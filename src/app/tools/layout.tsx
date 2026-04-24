import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout requireAnyOf={["page_analyser", "proposal_generator", "proposals", "pricing", "llm_generator", "content_strategy", "access_requester", "landing_page_generator", "qa_checklist", "grand_plan", "subscriptions", "email_verifier", "ad_image_generator"]}>
      {children}
    </AuthenticatedLayout>
  );
}
