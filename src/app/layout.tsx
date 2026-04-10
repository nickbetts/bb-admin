import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StratOS by i3MEDIA — Marketing intelligence for agencies",
  description: "16-channel marketing performance platform. GA4, Google Ads, Meta, TikTok, LinkedIn, Klaviyo and more. AI-powered insights, automated reporting, and 90-day forecasting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
