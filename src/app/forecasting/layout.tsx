import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forecasting — i3 Media StratOS",
  description:
    "90-day forecasts built from your actual data. Predictive projections with confidence intervals.",
  openGraph: {
    title: "Forecasting — i3 Media StratOS",
    description:
      "Multi-metric forecasting with 30/60/90-day windows, confidence intervals, and narrative explanations.",
    type: "website",
  },
};

export default function ForecastingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
