import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout
      uiVariant="enhanced"
      requireAnyOf={[
        "proposal_generator",
        "llm_generator",
        "content_generator",
        "access_requester",
        "landing_page_generator",
        "grand_plan",
        "internal_linking",
        "manage_tracking",
      ]}
    >
      {children}
    </AuthenticatedLayout>
  );
}
