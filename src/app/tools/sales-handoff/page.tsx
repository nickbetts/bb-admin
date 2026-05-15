"use client";

import { FormEvent, useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SalesHandoffForm {
  prospectName: string;
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  requestedDeliverables: string;
  budgetRange: string;
  otherInformation: string;
}

const INITIAL_FORM: SalesHandoffForm = {
  prospectName: "",
  website: "",
  targetAudienceSummary: "",
  secondCallAt: "",
  requestedDeliverables: "",
  budgetRange: "",
  otherInformation: "",
};

function looksLikeUrl(value: string): boolean {
  if (!value.trim()) return false;
  const candidate = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export default function SalesHandoffPage() {
  const { toast } = useToast();

  const [form, setForm] = useState<SalesHandoffForm>(INITIAL_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTaskUrl, setCreatedTaskUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.prospectName.trim().length > 0 &&
      form.website.trim().length > 0 &&
      form.targetAudienceSummary.trim().length > 0 &&
      form.secondCallAt.trim().length > 0 &&
      form.requestedDeliverables.trim().length > 0 &&
      form.budgetRange.trim().length > 0
    );
  }, [form]);

  function update<K extends keyof SalesHandoffForm>(key: K, value: SalesHandoffForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setCreatedTaskUrl(null);

    if (!canSubmit) {
      setFieldError("Please complete all required fields before creating the task.");
      return;
    }

    if (!looksLikeUrl(form.website)) {
      setFieldError("Website must be a valid URL.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tools/sales-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as { error?: string; taskUrl?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create ClickUp task");
      }

      setCreatedTaskUrl(data.taskUrl ?? null);
      setForm(INITIAL_FORM);
      toast("Sales handoff task created in ClickUp", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create ClickUp task";
      setFieldError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClipboardList style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              Sales Handoff
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              Capture first-call context and create a ClickUp prep task for marketing.
            </p>
          </div>
        </div>
      </div>

      {fieldError && (
        <div
          style={{
            marginBottom: 16,
            border: "1px solid var(--danger-border)",
            background: "var(--danger-bg)",
            color: "var(--danger-text)",
            borderRadius: "var(--r)",
            padding: "12px 14px",
            fontSize: 13,
          }}
        >
          {fieldError}
        </div>
      )}

      {createdTaskUrl && (
        <div
          style={{
            marginBottom: 16,
            border: "1px solid var(--success-border)",
            background: "var(--success-bg)",
            color: "var(--success-text)",
            borderRadius: "var(--r)",
            padding: "12px 14px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>Task created successfully. Marketing can pick this up immediately.</span>
          <a
            href={createdTaskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            Open in ClickUp <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Prospect or Company Name</label>
            <input
              className="form-input"
              value={form.prospectName}
              onChange={(e) => update("prospectName", e.target.value)}
              placeholder="Acme Sportswear"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Website URL</label>
            <input
              className="form-input"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://www.example.com"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Target Audience Summary</label>
            <textarea
              className="form-input"
              value={form.targetAudienceSummary}
              onChange={(e) => update("targetAudienceSummary", e.target.value)}
              placeholder="Who are they selling to, and what pain points came up on the call?"
              rows={4}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Second Call Date and Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.secondCallAt}
              onChange={(e) => update("secondCallAt", e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Requested Deliverables</label>
            <textarea
              className="form-input"
              value={form.requestedDeliverables}
              onChange={(e) => update("requestedDeliverables", e.target.value)}
              placeholder="What should marketing prepare before the second call?"
              rows={4}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Budget Range</label>
            <input
              className="form-input"
              value={form.budgetRange}
              onChange={(e) => update("budgetRange", e.target.value)}
              placeholder="e.g. GBP 3,000 to 5,000 per month"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Other Information</label>
            <textarea
              className="form-input"
              value={form.otherInformation}
              onChange={(e) => update("otherInformation", e.target.value)}
              placeholder="Add anything useful from the call: goals, timelines, blockers, decision-makers."
              rows={4}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !canSubmit}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating task...
                </>
              ) : (
                "Create ClickUp Task"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
