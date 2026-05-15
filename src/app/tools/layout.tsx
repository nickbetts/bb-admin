import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout
      uiVariant="enhanced"
      requireAnyOf={[
        "page_analyser",
        "proposal_generator",
        "proposals",
        "pricing",
        "llm_generator",
        "content_strategy",
        "content_generator",
        "access_requester",
        "landing_page_generator",
        "qa_checklist",
        "grand_plan",
        "subscriptions",
        "email_verifier",
        "ad_image_generator",
        "internal_linking",
        "keyword_tracker",
        "sales_handoff",
      ]}
    >
      {children}
    </AuthenticatedLayout>
  );
}
