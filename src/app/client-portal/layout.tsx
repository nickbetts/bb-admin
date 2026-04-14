import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal — i3 Media StratOS",
  description:
    "Branded client dashboards with magic-link login. Clients see reports, goals, and updates you choose.",
  openGraph: {
    title: "Client Portal — i3 Media StratOS",
    description:
      "Give clients their own branded portal with magic-link auth, report access, goal tracking, and communications log.",
    type: "website",
  },
};

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
