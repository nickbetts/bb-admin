import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | clickr",
    default: "Solutions | clickr",
  },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
