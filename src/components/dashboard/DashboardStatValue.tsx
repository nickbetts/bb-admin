"use client";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface DashboardStatValueProps {
  value: number;
  subtitle?: string;
}

/**
 * Thin client wrapper so the server-rendered dashboard page
 * can use AnimatedNumber (which needs requestAnimationFrame).
 */
export function DashboardStatValue({ value, subtitle }: DashboardStatValueProps) {
  return (
    <>
      <p className="stat-card-value">
        <AnimatedNumber value={value} />
      </p>
      {subtitle && (
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </>
  );
}
