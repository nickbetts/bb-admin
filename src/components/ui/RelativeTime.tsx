"use client";

import { useEffect, useState, useMemo } from "react";

const UNITS: [string, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 30_000) return "just now";
  if (diff < 60_000) return "< 1 min ago";

  for (const [unit, ms] of UNITS) {
    const count = Math.floor(diff / ms);
    if (count >= 1) return `${count} ${unit}${count !== 1 ? "s" : ""} ago`;
  }
  return "just now";
}

interface RelativeTimeProps {
  /** ISO string or Date object */
  date: string | Date;
  /** Refresh interval in ms. Default: 60000 (1 min) */
  refreshInterval?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Displays a human-friendly relative time ("3 min ago", "2 hours ago").
 * Auto-updates at the given refresh interval.
 */
export function RelativeTime({ date, refreshInterval = 60_000, className, style }: RelativeTimeProps) {
  const dateObj = useMemo(() => typeof date === "string" ? new Date(date) : date, [date]);
  const [text, setText] = useState(() => formatRelative(dateObj));

  useEffect(() => {
    const id = setInterval(() => setText(formatRelative(dateObj)), refreshInterval);
    return () => clearInterval(id);
  }, [dateObj, refreshInterval]);

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={dateObj.toLocaleString()}
      className={className}
      style={style}
      suppressHydrationWarning
    >
      {text}
    </time>
  );
}
