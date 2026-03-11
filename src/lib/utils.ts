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

export function getPositionChange(current: number, previous: number): { value: number; type: "up" | "down" | "same" } {
  if (current === previous) return { value: 0, type: "same" };
  if (current < previous) return { value: previous - current, type: "up" };
  return { value: current - previous, type: "down" };
}
