"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type ResourceType = "report" | "grand_plan" | "content_strategy" | "landing_page";

interface PortalPublishToggleProps {
  resourceType: ResourceType;
  resourceId: string;
  initialPublishedAt: string | Date | null;
  onChange?: (publishedAt: string | null) => void;
  size?: "sm" | "md";
}

/**
 * "Publish to client portal" toggle button.
 *
 * Calls POST /api/portal-publish to set or clear the resource's portalPublishedAt.
 * Self-checks the current user's `publish_to_portal` permission via /api/auth/me
 * and renders nothing for users without it (the backend also enforces this).
 */
export function PortalPublishToggle({
  resourceType,
  resourceId,
  initialPublishedAt,
  onChange,
  size = "sm",
}: PortalPublishToggleProps) {
  const [publishedAt, setPublishedAt] = useState<string | null>(
    initialPublishedAt ? new Date(initialPublishedAt).toISOString() : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPublish, setCanPublish] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { role?: string; permissions?: string[] } } | null) => {
        const u = data?.user;
        const allowed = !!u && (u.role === "admin" || u.permissions?.includes("publish_to_portal") === true);
        setCanPublish(allowed);
      })
      .catch(() => setCanPublish(false));
  }, []);

  if (canPublish === null || canPublish === false) return null;
  const isPublished = !!publishedAt;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId, publish: !isPublished }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Failed to update");
        return;
      }
      const next = isPublished ? null : new Date().toISOString();
      setPublishedAt(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }

  const Icon = busy ? Loader2 : isPublished ? EyeOff : Eye;
  const label = busy
    ? "Working…"
    : isPublished
      ? "Unpublish from portal"
      : "Publish to client portal";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <button
        onClick={toggle}
        disabled={busy}
        className={`btn ${isPublished ? "btn-secondary" : "btn-primary"} btn-${size}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        title={isPublished ? "Currently visible to client portal users" : "Make this visible to client portal users"}
      >
        <Icon style={{ width: 14, height: 14 }} className={busy ? "animate-spin" : undefined} />
        {label}
      </button>
      {error && <span style={{ fontSize: 11, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
