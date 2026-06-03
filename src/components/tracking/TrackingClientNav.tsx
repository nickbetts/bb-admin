"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TrackingClientNavProps {
  clientId: string;
}

const tabs = [
  { label: "Overview", href: (clientId: string) => `/tools/tracking-guru/${clientId}` },
  { label: "Audit", href: (clientId: string) => `/tools/tracking-guru/${clientId}/audit` },
  { label: "Events", href: (clientId: string) => `/tools/tracking-guru/${clientId}/events` },
  { label: "Test", href: (clientId: string) => `/tools/tracking-guru/${clientId}/test` },
  { label: "History", href: (clientId: string) => `/tools/tracking-guru/${clientId}/history` },
];

export function TrackingClientNav({ clientId }: TrackingClientNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href = tab.href(clientId);
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-(--accent) bg-(--accent-bg) text-(--accent-text)"
                : "border-(--border) bg-(--surface) text-(--text-2) hover:bg-(--bg)",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
