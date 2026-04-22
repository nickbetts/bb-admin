"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";

interface PreviewMarker {
  agencyEmail: string;
  portalUserName: string;
  clientId: string;
  expiresAt: number;
}

function readMarker(): PreviewMarker | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith("portal_preview="));
  if (!raw) return null;
  try {
    const value = decodeURIComponent(raw.split("=").slice(1).join("="));
    const parsed = JSON.parse(value) as PreviewMarker;
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function PortalPreviewBanner() {
  const [marker, setMarker] = useState<PreviewMarker | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const m = readMarker();
      setMarker(m);
      setMinutesLeft(m ? Math.max(0, Math.round((m.expiresAt - Date.now()) / 60000)) : 0);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!marker) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, #f59e0b, #ef4444)",
      color: "white",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      fontSize: 13,
      fontWeight: 500,
      position: "sticky",
      top: 0,
      zIndex: 60,
    }}>
      <Eye style={{ width: 14, height: 14 }} />
      <span>
        Previewing as <strong>{marker.portalUserName}</strong> — {marker.agencyEmail} · {minutesLeft}m left
      </span>
      <a
        href={`/api/portal/preview/exit?return=${encodeURIComponent("/clients")}`}
        style={{
          color: "white",
          textDecoration: "none",
          background: "rgba(255,255,255,0.18)",
          padding: "3px 10px",
          borderRadius: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
        }}
      >
        <X style={{ width: 12, height: 12 }} /> Exit preview
      </a>
    </div>
  );
}
