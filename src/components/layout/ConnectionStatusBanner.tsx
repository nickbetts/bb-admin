'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

interface ConnectionStatus {
  id: string;
  email: string;
  status: "ok" | "expired";
}

export function ConnectionStatusBanner() {
  const [expired, setExpired] = useState<ConnectionStatus[]>([]);

  useEffect(() => {
    fetch("/api/settings/connections/verify")
      .then((res) => res.ok ? res.json() : [])
      .then((statuses: ConnectionStatus[]) => {
        setExpired(statuses.filter((s) => s.status === "expired"));
      })
      .catch(() => {/* silently ignore — don't disrupt the app */});
  }, []);

  if (expired.length === 0) return null;

  const label =
    expired.length === 1
      ? `Google connection expired: ${expired[0].email}`
      : `${expired.length} Google connections expired: ${expired.map((c) => c.email).join(", ")}`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-4 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4 shrink-0 text-amber-600"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium truncate">{label}</span>
        <span className="hidden sm:inline text-amber-700">— data for affected clients may be unavailable.</span>
      </div>
      <Link
        href="/settings"
        className="shrink-0 rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300 hover:bg-amber-200 transition-colors"
      >
        Reconnect in Settings
      </Link>
    </div>
  );
}
