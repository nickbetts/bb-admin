import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatCurrency(amount: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function getDateRange(period: string): { startDate: string; endDate: string } {
  const today = new Date();
  const end = today.toISOString().split("T")[0];

  const periods: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "6m": 180,
    "12m": 365,
  };

  const days = periods[period] ?? 30;
  const start = new Date(today);
  start.setDate(start.getDate() - days);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end,
  };
}

export function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getPositionChange(current: number, previous: number): { value: number; type: "up" | "down" | "same" } {
  if (current === previous) return { value: 0, type: "same" };
  if (current < previous) return { value: previous - current, type: "up" };
  return { value: current - previous, type: "down" };
}

export function getPreviousPeriod(startDate: string, endDate: string): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  return {
    startDate: prevStart.toISOString().split("T")[0],
    endDate: prevEnd.toISOString().split("T")[0],
  };
}

export function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

/** Parse a named reporting period (e.g. "March 2025", "Q1 2025") into ISO date strings. */
export function parsePeriodToDateRange(period: string): { startDate: string; endDate: string } {
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  // Quarterly: "Q1 2025", "Q2 2025", etc.
  const quarterMatch = period.match(/^Q([1-4])\s+(\d{4})$/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    const endMonth = startMonth + 2;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, endMonth + 1, 0); // last day of endMonth
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  // Monthly: "March 2025", "January 2026", etc.
  const monthMatch = period.match(/^(\w+)\s+(\d{4})$/);
  if (monthMatch) {
    const monthIndex = MONTH_NAMES.indexOf(monthMatch[1]);
    const year = parseInt(monthMatch[2]);
    if (monthIndex !== -1) {
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0); // last day of month
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
  }

  // Fallback to last 30 days
  return getDateRange("30d");
}
