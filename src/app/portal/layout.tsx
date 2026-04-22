import { PortalPreviewBanner } from "@/components/portal/PortalPreviewBanner";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalPreviewBanner />
      {children}
    </>
  );
}
