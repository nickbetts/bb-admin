import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "i3media | Client Performance Dashboard",
  description: "Digital performance reporting for web design, PPC, paid social and SEO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
