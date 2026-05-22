"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Trash2,
  User,
  X,
} from "lucide-react";

type DeliveryFilter = "all" | "delivered" | "partial" | "failed" | "not-configured";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  formData: string | null;
  referrer: string | null;
  createdAt: string;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  webhookStatus?: string | null;
  webhookSentAt?: string | null;
  webhookHttpStatus?: number | null;
  webhookError?: string | null;
  notificationAttempts?: number | null;
  lastNotificationAttemptAt?: string | null;
  lastNotificationSuccessAt?: string | null;
}

interface LeadsViewerModalProps {
  lpId: string;
  isOpen: boolean;
  onClose: () => void;
  onLeadDeleted?: () => void;
}

interface LeadSource {
  label: string;
  detail: string;
  platform: "google" | "meta" | "other";
}

function GoogleBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 12, height: 12, display: "block" }}>
      <path
        d="M22.001 12.245c0-.816-.073-1.6-.209-2.353H12v4.451h5.602a4.79 4.79 0 0 1-2.078 3.141v2.608h3.364c1.969-1.812 3.113-4.481 3.113-7.847z"
        fill="#4285F4"
      />
      <path
        d="M12 22.4c2.808 0 5.16-.931 6.88-2.519l-3.364-2.608c-.931.624-2.123.995-3.516.995-2.707 0-4.999-1.827-5.815-4.284H2.706v2.69A10.4 10.4 0 0 0 12 22.4z"
        fill="#34A853"
      />
      <path
        d="M6.185 13.984A6.26 6.26 0 0 1 5.86 12c0-.688.117-1.357.325-1.984v-2.69H2.706A10.4 10.4 0 0 0 1.6 12c0 1.664.4 3.24 1.106 4.674l3.479-2.69z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.732c1.527 0 2.9.525 3.978 1.555l2.987-2.987C17.156 2.63 14.804 1.6 12 1.6a10.4 10.4 0 0 0-9.294 5.726l3.479 2.69c.816-2.457 3.108-4.284 5.815-4.284z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MetaBadgeIcon() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 11, height: 11, display: "block" }}>
        <path
          fill="#1877F2"
          d="M14 8h-2c-.552 0-1 .448-1 1v2h3l-.5 3H11v7H8v-7H5v-3h3V9a4 4 0 0 1 4-4h2v3z"
        />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 11, height: 11, display: "block" }}>
        <rect
          x="5"
          y="5"
          width="14"
          height="14"
          rx="4"
          fill="none"
          stroke="#C13584"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="#C13584" strokeWidth="2" />
        <circle cx="16.5" cy="7.5" r="1" fill="#C13584" />
      </svg>
    </span>
  );
}

function LeadSourceBadgeIcon({ source }: { source: LeadSource }) {
  if (source.platform === "google") return <GoogleBadgeIcon />;
  if (source.platform === "meta") return <MetaBadgeIcon />;
  return null;
}

function getReferrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function parseFormData(formData: string | null): Record<string, string> {
  if (!formData) return {};
  try {
    const parsed = JSON.parse(formData) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [key, String(value).trim()])
        .filter(([, value]) => value.length > 0),
    );
  } catch {
    return {};
  }
}

function isGoogleSource(value: string): boolean {
  const normalised = value.toLowerCase();
  return (
    normalised.includes("google") ||
    normalised.includes("gclid") ||
    normalised.includes("adwords") ||
    normalised.includes("doubleclick")
  );
}

function isMetaSource(value: string): boolean {
  const normalised = value.toLowerCase();
  return (
    normalised.includes("facebook") ||
    normalised.includes("meta") ||
    normalised.includes("instagram") ||
    normalised.includes("fbclid")
  );
}

function detectLeadSource(lead: Lead): LeadSource {
  const fields = parseFormData(lead.formData);
  const utmSource =
    fields.utm_source || fields.utmSource || fields.source || fields.channel || fields.platform;

  if (utmSource) {
    const normalised = utmSource.toLowerCase();
    if (isGoogleSource(normalised))
      return { label: "Google", detail: utmSource, platform: "google" };
    if (isMetaSource(normalised)) {
      return { label: "Meta", detail: utmSource, platform: "meta" };
    }
    if (normalised.includes("linkedin"))
      return { label: "LinkedIn", detail: utmSource, platform: "other" };
    if (normalised.includes("tiktok"))
      return { label: "TikTok", detail: utmSource, platform: "other" };
    return { label: utmSource, detail: "UTM source", platform: "other" };
  }

  const host = getReferrerHost(lead.referrer);
  if (!host) return { label: "Direct", detail: "No referrer", platform: "other" };
  if (isGoogleSource(host)) return { label: "Google", detail: host, platform: "google" };
  if (isMetaSource(host) || host.includes("fb.")) {
    return { label: "Meta", detail: host, platform: "meta" };
  }
  if (host.includes("linkedin.")) return { label: "LinkedIn", detail: host, platform: "other" };
  if (host.includes("tiktok.")) return { label: "TikTok", detail: host, platform: "other" };
  if (host.includes("bing.")) return { label: "Bing", detail: host, platform: "other" };
  if (host.includes("youtube.")) return { label: "YouTube", detail: host, platform: "other" };
  if (host.includes("x.com") || host.includes("twitter.com") || host.includes("t.co")) {
    return { label: "X", detail: host, platform: "other" };
  }
  return { label: "Referral", detail: host, platform: "other" };
}

function getExtraFields(lead: Lead): Array<{ key: string; value: string }> {
  const data = parseFormData(lead.formData);
  const ignore = new Set([
    "name",
    "fullName",
    "full_name",
    "firstName",
    "first_name",
    "lastName",
    "last_name",
    "email",
    "phone",
    "mobile",
    "whatsapp",
    "message",
    "notes",
    "comment",
    "enquiry",
    "cf-turnstile-response",
  ]);

  return Object.entries(data)
    .filter(([key]) => !ignore.has(key))
    .map(([key, value]) => ({ key, value }));
}

function sourceBadgeStyle(label: string) {
  if (label === "Google") return { background: "#E8F0FE", color: "#1A73E8" };
  if (label === "Meta") return { background: "#EEF3FF", color: "#4A4CE0" };
  if (label === "Facebook") return { background: "#EAF2FF", color: "#1877F2" };
  if (label === "Instagram") return { background: "#FCEAF6", color: "#C13584" };
  if (label === "LinkedIn") return { background: "#EAF4FE", color: "#0A66C2" };
  if (label === "TikTok") return { background: "#F2F2F2", color: "#111111" };
  return { background: "var(--border-subtle)", color: "var(--text-3)" };
}

function normaliseDeliveryStatus(
  status: string | null | undefined,
): "sent" | "failed" | "skipped" | "unknown" {
  if (status === "sent" || status === "failed" || status === "skipped") return status;
  return "unknown";
}

function getLeadDeliverySummary(lead: Lead): {
  label: string;
  detail: string;
  style: { background: string; color: string };
} {
  const emailStatus = normaliseDeliveryStatus(lead.emailStatus);
  const webhookStatus = normaliseDeliveryStatus(lead.webhookStatus);
  const sentCount = Number(emailStatus === "sent") + Number(webhookStatus === "sent");
  const failedCount = Number(emailStatus === "failed") + Number(webhookStatus === "failed");

  if (sentCount > 0 && failedCount > 0) {
    return {
      label: "Partially delivered",
      detail: "One notification channel succeeded and one failed",
      style: { background: "#FFF5E5", color: "#9A5C00" },
    };
  }

  if (sentCount > 0) {
    return {
      label: "Delivered",
      detail: "At least one notification channel succeeded",
      style: { background: "#E8F8EF", color: "#19703F" },
    };
  }

  if (failedCount > 0) {
    return {
      label: "Delivery failed",
      detail: "No notification channel succeeded",
      style: { background: "#FEEBEC", color: "#B42318" },
    };
  }

  if (emailStatus === "skipped" && webhookStatus === "skipped") {
    return {
      label: "Not configured",
      detail: "No notification channels were configured for this submission",
      style: { background: "#EEF2FF", color: "#3B4CCA" },
    };
  }

  return {
    label: "Unknown",
    detail: "Legacy lead or missing delivery metadata",
    style: { background: "var(--border-subtle)", color: "var(--text-3)" },
  };
}

function formatChannelStatus(status: string | null | undefined): string {
  const normalised = normaliseDeliveryStatus(status);
  if (normalised === "unknown") return "Unknown";
  return normalised.charAt(0).toUpperCase() + normalised.slice(1);
}

export function LeadsViewerModal({ lpId, isOpen, onClose, onLeadDeleted }: LeadsViewerModalProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [retryingLeadId, setRetryingLeadId] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const limit = 50;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/leads?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = (await res.json()) as { leads?: Lead[]; total?: number };
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [lpId, page]);

  useEffect(() => {
    if (!isOpen) return;
    void loadLeads();
  }, [isOpen, loadLeads]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  const visibleLeads = useMemo(() => {
    if (deliveryFilter === "all") return leads;

    return leads.filter((lead) => {
      const summary = getLeadDeliverySummary(lead).label;
      if (deliveryFilter === "delivered") return summary === "Delivered";
      if (deliveryFilter === "partial") return summary === "Partially delivered";
      if (deliveryFilter === "failed") return summary === "Delivery failed";
      if (deliveryFilter === "not-configured") return summary === "Not configured";
      return true;
    });
  }, [leads, deliveryFilter]);

  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of visibleLeads) {
      const source = detectLeadSource(lead).label;
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [visibleLeads]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Message",
      "Source",
      "Date",
      "Referrer",
      "Email status",
      "Webhook status",
      "Delivery attempts",
      "Extra fields",
    ];
    const rows = visibleLeads.map((lead) => {
      const source = detectLeadSource(lead);
      const extras = getExtraFields(lead)
        .map((item) => `${item.key}: ${item.value}`)
        .join(" | ");
      return [
        lead.name,
        lead.email,
        lead.phone ?? "",
        lead.message ?? "",
        source.label,
        new Date(lead.createdAt).toLocaleString("en-GB"),
        lead.referrer ?? "",
        formatChannelStatus(lead.emailStatus),
        formatChannelStatus(lead.webhookStatus),
        lead.notificationAttempts ?? "",
        extras,
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRetryWebhook = async (lead: Lead) => {
    setRetryingLeadId(lead.id);
    setError(null);

    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/leads/${lead.id}/retry-webhook`, {
        method: "POST",
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        lead?: Lead;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to retry webhook delivery");
      }

      if (data.lead) {
        setLeads((prev) =>
          prev.map((item) => (item.id === lead.id ? { ...item, ...data.lead } : item)),
        );
      } else {
        void loadLeads();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retry webhook delivery");
    } finally {
      setRetryingLeadId(null);
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    const confirmed = window.confirm(`Delete lead from ${lead.email}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingLeadId(lead.id);
    setError(null);

    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/leads?leadId=${lead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete lead");

      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
      setTotal((prev) => Math.max(0, prev - 1));
      onLeadDeleted?.();

      if (leads.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        void loadLeads();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete lead");
    } finally {
      setDeletingLeadId(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          border: "1px solid var(--border)",
          maxWidth: 1040,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 50px rgba(2, 6, 23, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "16px 18px 14px",
            borderBottom: "1px solid var(--border)",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Submitted Leads
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                {total === 0 ? "No leads yet" : `${total} total lead${total !== 1 ? "s" : ""}`}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                Showing {visibleLeads.length} on this page
              </span>
              {sourceBreakdown.slice(0, 4).map(([label, count]) => {
                const badge = sourceBadgeStyle(label);
                return (
                  <span
                    key={label}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: badge.background,
                      color: badge.color,
                    }}
                  >
                    {label} {count}
                  </span>
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(
                [
                  { id: "all", label: "All" },
                  { id: "failed", label: "Failed" },
                  { id: "partial", label: "Partial" },
                  { id: "delivered", label: "Delivered" },
                  { id: "not-configured", label: "Not configured" },
                ] as Array<{ id: DeliveryFilter; label: string }>
              ).map((item) => {
                const active = deliveryFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setDeliveryFilter(item.id)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 9px",
                      borderRadius: 999,
                      border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: active ? "var(--accent-bg)" : "var(--surface)",
                      color: active ? "var(--accent)" : "var(--text-3)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {visibleLeads.length > 0 && (
              <button
                onClick={handleExportCSV}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 11px",
                  background: "var(--accent-bg)",
                  color: "var(--accent)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
                title="Export leads as CSV"
              >
                <Download style={{ width: 13, height: 13 }} />
                Export CSV
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-4)",
                padding: 2,
                display: "flex",
              }}
              title="Close"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 220,
                color: "var(--text-3)",
              }}
            >
              <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
            </div>
          ) : error ? (
            <div
              style={{
                margin: 16,
                padding: 12,
                color: "var(--danger)",
                fontSize: 12,
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                borderRadius: 10,
              }}
            >
              {error}
            </div>
          ) : visibleLeads.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 220,
                color: "var(--text-4)",
                fontSize: 13,
              }}
            >
              {deliveryFilter === "all"
                ? "No leads captured yet."
                : "No leads match this delivery filter."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
              {visibleLeads.map((lead) => {
                const source = detectLeadSource(lead);
                const badge = sourceBadgeStyle(source.label);
                const extras = getExtraFields(lead);
                const delivery = getLeadDeliverySummary(lead);
                return (
                  <article
                    key={lead.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      background: "var(--surface)",
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <User
                            style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                            {lead.name || "Unknown"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Mail
                            style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }}
                          />
                          <a
                            href={`mailto:${lead.email}`}
                            style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}
                          >
                            {lead.email}
                          </a>
                        </div>
                        {lead.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone
                              style={{
                                width: 12,
                                height: 12,
                                color: "var(--text-3)",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ color: "var(--text-2)", fontSize: 12 }}>
                              {lead.phone}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: badge.background,
                            color: badge.color,
                          }}
                          title={source.detail}
                        >
                          <LeadSourceBadgeIcon source={source} />
                          {source.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: delivery.style.background,
                            color: delivery.style.color,
                          }}
                          title={delivery.detail}
                        >
                          {delivery.label}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "var(--text-4)",
                            fontSize: 11,
                          }}
                        >
                          <Calendar style={{ width: 11, height: 11 }} />
                          {new Date(lead.createdAt).toLocaleString("en-GB")}
                        </span>
                        <button
                          onClick={() => handleRetryWebhook(lead)}
                          disabled={
                            retryingLeadId === lead.id ||
                            deletingLeadId === lead.id ||
                            normaliseDeliveryStatus(lead.webhookStatus) !== "failed"
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 8px",
                            border: "1px solid var(--accent)",
                            borderRadius: 8,
                            background: "transparent",
                            color: "var(--accent)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor:
                              retryingLeadId === lead.id ||
                              deletingLeadId === lead.id ||
                              normaliseDeliveryStatus(lead.webhookStatus) !== "failed"
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              retryingLeadId === lead.id ||
                              deletingLeadId === lead.id ||
                              normaliseDeliveryStatus(lead.webhookStatus) !== "failed"
                                ? 0.6
                                : 1,
                            fontFamily: "inherit",
                          }}
                          title={
                            normaliseDeliveryStatus(lead.webhookStatus) === "failed"
                              ? "Retry webhook delivery"
                              : "Webhook retry not required"
                          }
                        >
                          {retryingLeadId === lead.id ? (
                            <Loader2
                              style={{
                                width: 11,
                                height: 11,
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          ) : (
                            <RotateCcw style={{ width: 11, height: 11 }} />
                          )}
                          Retry webhook
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead)}
                          disabled={deletingLeadId === lead.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 8px",
                            border: "1px solid var(--danger)",
                            borderRadius: 8,
                            background: "transparent",
                            color: "var(--danger)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: deletingLeadId === lead.id ? "not-allowed" : "pointer",
                            opacity: deletingLeadId === lead.id ? 0.6 : 1,
                            fontFamily: "inherit",
                          }}
                          title="Delete lead"
                        >
                          {deletingLeadId === lead.id ? (
                            <Loader2
                              style={{
                                width: 11,
                                height: 11,
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          ) : (
                            <Trash2 style={{ width: 11, height: 11 }} />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>

                    {!!lead.message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-2)",
                          lineHeight: 1.4,
                          padding: "8px 10px",
                          background: "var(--border-subtle)",
                          borderRadius: 8,
                        }}
                      >
                        {lead.message}
                      </div>
                    )}

                    {lead.referrer && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-3)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <ExternalLink style={{ width: 11, height: 11 }} />
                        <a
                          href={lead.referrer}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent)", textDecoration: "none" }}
                          title={lead.referrer}
                        >
                          {source.detail}
                        </a>
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          lineHeight: 1.3,
                          padding: "4px 7px",
                          borderRadius: 8,
                          background: "var(--border-subtle)",
                          color: "var(--text-2)",
                        }}
                        title={lead.emailError ?? undefined}
                      >
                        <strong>Email:</strong> {formatChannelStatus(lead.emailStatus)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          lineHeight: 1.3,
                          padding: "4px 7px",
                          borderRadius: 8,
                          background: "var(--border-subtle)",
                          color: "var(--text-2)",
                        }}
                        title={lead.webhookError ?? undefined}
                      >
                        <strong>Webhook:</strong> {formatChannelStatus(lead.webhookStatus)}
                        {typeof lead.webhookHttpStatus === "number"
                          ? ` (${lead.webhookHttpStatus})`
                          : ""}
                      </span>
                      {typeof lead.notificationAttempts === "number" && (
                        <span
                          style={{
                            fontSize: 10,
                            lineHeight: 1.3,
                            padding: "4px 7px",
                            borderRadius: 8,
                            background: "var(--border-subtle)",
                            color: "var(--text-2)",
                          }}
                        >
                          <strong>Attempts:</strong> {lead.notificationAttempts}
                        </span>
                      )}
                    </div>

                    {extras.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {extras.map((item) => (
                          <span
                            key={item.key}
                            style={{
                              fontSize: 10,
                              lineHeight: 1.3,
                              padding: "4px 7px",
                              borderRadius: 8,
                              background: "var(--border-subtle)",
                              color: "var(--text-2)",
                              maxWidth: "100%",
                            }}
                            title={`${item.key}: ${item.value}`}
                          >
                            <strong>{item.key}:</strong>{" "}
                            {item.value.length > 56 ? `${item.value.slice(0, 56)}...` : item.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {total > limit && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!canPrevious}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  background: canPrevious ? "var(--accent)" : "var(--border)",
                  color: canPrevious ? "#fff" : "var(--text-4)",
                  border: "none",
                  borderRadius: 7,
                  cursor: canPrevious ? "pointer" : "default",
                  fontFamily: "inherit",
                  opacity: canPrevious ? 1 : 0.55,
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={!canNext}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  background: canNext ? "var(--accent)" : "var(--border)",
                  color: canNext ? "#fff" : "var(--text-4)",
                  border: "none",
                  borderRadius: 7,
                  cursor: canNext ? "pointer" : "default",
                  fontFamily: "inherit",
                  opacity: canNext ? 1 : 0.55,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
