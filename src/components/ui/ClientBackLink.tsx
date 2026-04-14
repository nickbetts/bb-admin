"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Contextual back-link shown at the top of tool pages when opened from a client hub.
 * Reads `clientId` and `clientName` from URL search params.
 * Renders nothing if no clientId is present.
 */
export function ClientBackLink() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clientName = searchParams.get("clientName");
  const [clientSlug, setClientSlug] = useState<string | null>(null);

  // Fetch client slug for the link (we only have clientId in the URL params)
  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/clients/${clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.slug) setClientSlug(data.slug);
      })
      .catch(() => {});
  }, [clientId]);

  if (!clientId || !clientName) return null;

  const href = clientSlug ? `/clients/${clientSlug}` : `/clients`;

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-2)",
        textDecoration: "none",
        marginBottom: 16,
        transition: "color 0.15s",
      }}
      className="hover:text-[var(--text)]"
    >
      <ArrowLeft style={{ width: 14, height: 14 }} />
      Back to {clientName}
    </Link>
  );
}
