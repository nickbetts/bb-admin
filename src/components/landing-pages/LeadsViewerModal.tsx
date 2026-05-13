"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Mail, User, Phone, MessageSquare, Calendar, ExternalLink, Download } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  formData: string | null;
  referrer: string | null;
  createdAt: string;
}

interface LeadsViewerModalProps {
  lpId: string;
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-sm)",
  fontSize: 12,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export function LeadsViewerModal({ lpId, isOpen, onClose }: LeadsViewerModalProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    fetch(`/api/tools/landing-pages/${lpId}/leads?page=${page}&limit=${limit}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch leads");
        return res.json();
      })
      .then((data) => {
        setLeads(data.leads ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [lpId, isOpen, page]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / limit);
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Message", "Date", "Referrer"];
    const rows = leads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone ?? "",
      lead.message ?? "",
      new Date(lead.createdAt).toLocaleString(),
      lead.referrer ?? "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
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
          background: "var(--bg)",
          borderRadius: "var(--r)",
          border: "1px solid var(--border)",
          maxWidth: 1000,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              Submitted Leads
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "var(--text-3)",
              }}
            >
              {total === 0 ? "No leads yet" : `${total} total lead${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {total > 0 && (
              <button
                onClick={handleExportCSV}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: "var(--accent-bg)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                }}
                title="Export leads as CSV"
              >
                <Download style={{ width: 12, height: 12 }} />
                Export
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

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 200,
                color: "var(--text-3)",
              }}
            >
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            </div>
          ) : error ? (
            <div
              style={{
                padding: 16,
                color: "var(--error-text)",
                fontSize: 12,
                background: "var(--error-bg)",
                margin: 16,
                borderRadius: "var(--r-sm)",
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
                minHeight: 200,
                color: "var(--text-4)",
                fontSize: 13,
              }}
            >
              No leads captured yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {leads.map((lead, idx) => (
                <div
                  key={lead.id}
                  style={{
                    padding: 12,
                    borderBottom: idx < leads.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* First row: name, email, date */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <User style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: "var(--text)", fontSize: 12 }}>
                          {lead.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail style={{ width: 12, height: 12, color: "var(--text-3)", flexShrink: 0 }} />
                        <a
                          href={`mailto:${lead.email}`}
                          style={{
                            color: "var(--accent)",
                            fontSize: 11,
                            textDecoration: "none",
                          }}
                        >
                          {lead.email}
                        </a>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--text-4)",
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Calendar style={{ width: 11, height: 11 }} />
                      {new Date(lead.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Additional fields */}
                  <div style={{ display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" }}>
                    {lead.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-3)" }}>
                        <Phone style={{ width: 11, height: 11, flexShrink: 0 }} />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.message && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, color: "var(--text-3)", flex: 1 }}>
                        <MessageSquare style={{ width: 11, height: 11, flexShrink: 0, marginTop: 1 }} />
                        <span style={{ maxWidth: 400, wordBreak: "break-word" }}>{lead.message}</span>
                      </div>
                    )}
                    {lead.referrer && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-3)" }}>
                        <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
                        <a
                          href={lead.referrer}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent)", textDecoration: "none" }}
                          title={lead.referrer}
                        >
                          {new URL(lead.referrer).hostname}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Extra form fields */}
                  {lead.formData && (
                    <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 4 }}>
                      {(() => {
                        try {
                          const extra = JSON.parse(lead.formData) as Record<string, unknown>;
                          return (
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {Object.entries(extra).map(([key, val]) => (
                                <span key={key}>
                                  <strong>{key}:</strong>{" "}
                                  {String(val).slice(0, 100)}
                                  {String(val).length > 100 ? "..." : ""}
                                </span>
                              ))}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - pagination */}
        {total > limit && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 12,
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrevious}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  background: canPrevious ? "var(--accent)" : "var(--border)",
                  color: canPrevious ? "#fff" : "var(--text-4)",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  cursor: canPrevious ? "pointer" : "default",
                  fontFamily: "inherit",
                  opacity: canPrevious ? 1 : 0.5,
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  background: canNext ? "var(--accent)" : "var(--border)",
                  color: canNext ? "#fff" : "var(--text-4)",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  cursor: canNext ? "pointer" : "default",
                  fontFamily: "inherit",
                  opacity: canNext ? 1 : 0.5,
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
