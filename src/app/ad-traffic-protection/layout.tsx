import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ad Traffic Protection — i3 Media",
  description:
    "Every fraudulent click costs you money. i3 Media's Ad Traffic Protection monitors 100% of your paid clicks, proves how much is wasted, and actively blocks repeat offenders. Included with every management contract.",
  openGraph: {
    title: "Ad Traffic Protection by i3 Media",
    description:
      "Dual-layer click fraud monitoring for Google Ads and Meta — included in every management contract. Platform fraud data plus independent landing page detection.",
    type: "website",
  },
};

export default function AdTrafficProtectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
