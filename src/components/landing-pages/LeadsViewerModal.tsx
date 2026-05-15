"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Trash2,
  User,
  X,
} from "lucide-react";

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

function detectLeadSource(lead: Lead): LeadSource {
  const fields = parseFormData(lead.formData);
  const utmSource =
    fields.utm_source
    || fields.utmSource
    || fields.source
    || fields.channel
    || fields.platform;

  if (utmSource) {
    const normalised = utmSource.toLowerCase();
    if (normalised.includes("google")) return { label: "Google", detail: utmSource };
    if (normalised.includes("facebook") || normalised.includes("meta")) return { label: "Facebook", detail: utmSource };
    if (normalised.includes("instagram")) return { label: "Instagram", detail: utmSource };
    if (normalised.includes("linkedin")) return { label: "LinkedIn", detail: utmSource };
    if (normalised.includes("tiktok")) return { label: "TikTok", detail: utmSource };
    return { label: utmSource, detail: "UTM source" };
  }

  const host = getReferrerHost(lead.referrer);
  if (!host) return { label: "Direct", detail: "No referrer" };
  if (host.includes("google.")) return { label: "Google", detail: host };
  if (host.includes("facebook.") || host.includes("fb.")) return { label: "Facebook", detail: host };
  if (host.includes("instagram.")) return { label: "Instagram", detail: host };
  if (host.includes("linkedin.")) return { label: "LinkedIn", detail: host };
  if (host.includes("tiktok.")) return { label: "TikTok", detail: host };
  if (host.includes("bing.")) return { label: "Bing", detail: host };
  if (host.includes("youtube.")) return { label: "YouTube", detail: host };
  if (host.includes("x.com") || host.includes("twitter.com") || host.includes("t.co")) return { label: "X", detail: host };
  return { label: "Referral", detail: host };
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
  if (label === "Facebook") return { background: "#EAF2FF", color: "#1877F2" };
  if (label === "Instagram") return { background: "#FCEAF6", color: "#C13584" };
  if (label === "LinkedIn") return { background: "#EAF4FE", color: "#0A66C2" };
  if (label === "TikTok") return { background: "#F2F2F2", color: "#111111" };
  return { background: "var(--border-subtle)", color: "var(--text-3)" };
}

function normaliseDeliveryStatus(status: string | null | undefined): "sent" | "failed" | "skipped" | "unknown" {
  if (status === "sent" || status === "failed" || status === "skipped") return status;
  return "unknown";
}

function getLeadDeliverySummary(lead: Lead): { label: string; detail: string; style: { background: string; color: string } } {
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
  const limit = 50;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/leads?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json() as { leads?: Lead[]; total?: number };
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

  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const source = detectLeadSource(lead).label;
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [leads]);

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
    const rows = leads.map((lead) => {
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
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {total > 0 && (
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
          ) : leads.length === 0 ? (
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
              No leads captured yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
              {leads.map((lead) => {
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <User style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{lead.name || "Unknown"}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Mail style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }} />
                          <a href={`mailto:${lead.email}`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}>
                            {lead.email}
                          </a>
                        </div>
                        {lead.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }} />
                            <span style={{ color: "var(--text-2)", fontSize: 12 }}>{lead.phone}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: badge.background,
                            color: badge.color,
                          }}
                          title={source.detail}
                        >
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
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-4)", fontSize: 11 }}>
                          <Calendar style={{ width: 11, height: 11 }} />
                          {new Date(lead.createdAt).toLocaleString("en-GB")}
                        </span>
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
                            <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Trash2 style={{ width: 11, height: 11 }} />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>

                    {!!lead.message && (
                      <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4, padding: "8px 10px", background: "var(--border-subtle)", borderRadius: 8 }}>
                        {lead.message}
                      </div>
                    )}

                    {lead.referrer && (
                      <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
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
                        {typeof lead.webhookHttpStatus === "number" ? ` (${lead.webhookHttpStatus})` : ""}
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
                            <strong>{item.key}:</strong> {item.value.length > 56 ? `${item.value.slice(0, 56)}...` : item.value}
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
