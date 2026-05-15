"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Loader2, Sparkles, Zap } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface SalesHandoffForm {
  prospectName: string;
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  interestedServices: string[];
  budgetRange: string;
  otherInformation: string;
}

const DEFAULT_SERVICE_OPTIONS = [
  "Google PPC",
  "Paid Meta",
  "Organic Social",
  "Website Design",
  "SEO",
  "Custom Landing Pages",
  "Email marketing",
];

const INITIAL_FORM: SalesHandoffForm = {
  prospectName: "",
  website: "",
  targetAudienceSummary: "",
  secondCallAt: "",
  interestedServices: [],
  budgetRange: "",
  otherInformation: "",
};

interface ConfettiPiece {
  id: number;
  left: number;
  size: number;
  delayMs: number;
  durationMs: number;
  rotateDeg: number;
  color: string;
  shape: "rect" | "pill";
}

const CHAOS_CONFETTI_COLOURS = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

function createChaosConfettiPieces(count = 84): ConfettiPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    delayMs: Math.random() * 420,
    durationMs: 1500 + Math.random() * 1600,
    rotateDeg: Math.random() * 360,
    color: CHAOS_CONFETTI_COLOURS[Math.floor(Math.random() * CHAOS_CONFETTI_COLOURS.length)],
    shape: Math.random() > 0.5 ? "pill" : "rect",
  }));
}

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confettiRunId, setConfettiRunId] = useState(0);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>(() => createChaosConfettiPieces(84));
  const [serviceOptions, setServiceOptions] = useState<string[]>(DEFAULT_SERVICE_OPTIONS);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/tools/sales-handoff/config");
        if (!res.ok) return;

        const data = (await res.json()) as { services?: string[] };
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServiceOptions(data.services);
        }
      } catch {
        // Keep default options when config is unavailable.
      }
    }

    void loadConfig();
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.prospectName.trim().length > 0 &&
      form.website.trim().length > 0 &&
      form.targetAudienceSummary.trim().length > 0 &&
      form.secondCallAt.trim().length > 0 &&
      form.budgetRange.trim().length > 0
    );
  }, [form]);

  function update<K extends keyof SalesHandoffForm>(key: K, value: SalesHandoffForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleService(service: string) {
    setForm((prev) => ({
      ...prev,
      interestedServices: prev.interestedServices.includes(service)
        ? prev.interestedServices.filter((item) => item !== service)
        : [...prev.interestedServices, service],
    }));
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
      setConfettiPieces(createChaosConfettiPieces(84));
      setConfettiRunId((prev) => prev + 1);
      setShowSuccessModal(true);
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

      <div
        style={{
          marginBottom: 16,
          border: "1px solid var(--warning-border)",
          background: "var(--warning-bg)",
          color: "var(--warning-text)",
          borderRadius: "var(--r)",
          padding: "12px 14px",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Marketing needs at least 48 hours&apos; notice to prepare a plan for a potential client.
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
            <label className="form-label">Budget Range</label>
            <input
              className="form-input"
              value={form.budgetRange}
              onChange={(e) => update("budgetRange", e.target.value)}
              placeholder="e.g. GBP 3,000 to 5,000 per month"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label className="form-label">Services They Might Be Interested In</label>
            <div style={{ display: "grid", gap: 8 }}>
              {serviceOptions.map((service) => {
                const checked = form.interestedServices.includes(service);
                return (
                  <label
                    key={service}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--text-2)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(service)}
                    />
                    <span>{service}</span>
                  </label>
                );
              })}
            </div>
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

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Chaos Mode Complete"
        description="Your sales handoff task is now live in ClickUp."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
            {createdTaskUrl && (
              <a
                href={createdTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
              >
                Open ClickUp Task <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            )}
          </>
        }
      >
        <div
          style={{
            position: "relative",
            minHeight: 250,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-lg)",
            background: "linear-gradient(160deg, rgba(239,68,68,0.08), rgba(59,130,246,0.06) 45%, rgba(250,204,21,0.08))",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            padding: "24px 16px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {confettiPieces.map((piece) => (
              <span
                key={`${confettiRunId}-${piece.id}`}
                style={{
                  position: "absolute",
                  top: -24,
                  left: `${piece.left}%`,
                  width: piece.size,
                  height: piece.shape === "pill" ? Math.max(4, piece.size * 0.45) : piece.size,
                  borderRadius: piece.shape === "pill" ? 999 : 2,
                  background: piece.color,
                  opacity: 0.95,
                  transform: `rotate(${piece.rotateDeg}deg)`,
                  animation: `salesHandoffConfettiFall ${piece.durationMs}ms cubic-bezier(0.18, 0.82, 0.35, 1) ${piece.delayMs}ms forwards`,
                }}
              />
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                margin: "0 auto 14px",
                display: "grid",
                placeItems: "center",
                color: "white",
                background: "linear-gradient(135deg, #ef4444, #f97316 52%, #facc15)",
                boxShadow: "0 14px 32px rgba(239, 68, 68, 0.38)",
                animation: "salesHandoffChaosPulse 1.4s ease-in-out infinite",
              }}
            >
              <Sparkles style={{ width: 30, height: 30 }} />
            </div>

            <p
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                margin: "0 0 8px",
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(17,24,39,0.06)",
                color: "var(--text-2)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <Zap style={{ width: 12, height: 12 }} /> Chaos Mode
            </p>

            <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
              Sales Handoff Created
            </h3>

            <p style={{ margin: 0, fontSize: 14, color: "var(--text-2)", lineHeight: 1.55 }}>
              Marketing has everything they need. Open the task to see the brief and track checklist progress.
            </p>
          </div>

          <style>{`
            @keyframes salesHandoffConfettiFall {
              0% {
                transform: translateY(-18px) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(330px) rotate(520deg);
                opacity: 0;
              }
            }
            @keyframes salesHandoffChaosPulse {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.08);
              }
            }
          `}</style>
        </div>
      </Modal>
    </div>
  );
}
