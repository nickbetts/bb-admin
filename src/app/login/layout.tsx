import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StratOS by i3MEDIA — 16-channel marketing intelligence for agencies",
  description:
    "StratOS connects GA4, Google Ads, Meta, TikTok, LinkedIn, Klaviyo and 10 more channels in one place. AI-powered anomaly detection, automated reporting, and 90-day forecasting. Built by i3MEDIA.",
  openGraph: {
    title: "StratOS by i3MEDIA — 16-channel marketing intelligence",
    description:
      "Every channel in one platform. Anomalies flagged before your client notices. Reports that write themselves. Built by an agency, for agencies.",
    type: "website",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
