"use client";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Client component that displays a time-aware greeting.
 * suppressHydrationWarning tolerates the server-vs-browser time difference.
 */
export function DashboardGreeting({ name }: { name: string }) {
  return (
    <h1 className="page-title" suppressHydrationWarning>
      {getGreeting(new Date().getHours())}, {name} 👋
    </h1>
  );
}
