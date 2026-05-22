"use client";

import { useState, useEffect, use, useRef } from "react";
import { Loader2, Lock, Download, Calendar, Printer, MessageSquare, X } from "lucide-react";

export default function GrandPlanSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enquiryFormEnabled, setEnquiryFormEnabled] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [isPresentationView, setIsPresentationView] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const viewParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("view")
        : null;
    const presentationView = viewParam === "presentation";
    setIsPresentationView(presentationView);
    const qs = presentationView ? "?view=presentation" : "";
    fetch(`/api/share/grand-plan/${token}${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.passwordRequired) {
          setPasswordRequired(true);
          setTitle(data.title);
          setClientName(data.clientName ?? null);
          setEnquiryFormEnabled(Boolean(data.enquiryFormEnabled));
        } else {
          setTitle(data.title);
          setClientName(data.clientName ?? null);
          setEnquiryFormEnabled(Boolean(data.enquiryFormEnabled));
          setHtml(data.html);
        }
      })
      .catch(() => setError("Failed to load plan"))
      .finally(() => setLoading(false));
  }, [token]);

  // Resize iframe to fit content via postMessage from the embedded document
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "gp:ready" && typeof data.height === "number" && iframeRef.current) {
        iframeRef.current.style.height = Math.max(data.height, 600) + "px";
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const viewParam =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("view")
          : null;
      const qs = viewParam === "presentation" ? "?view=presentation" : "";
      const res = await fetch(`/api/share/grand-plan/${token}${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setHtml(data.html);
        setClientName(data.clientName ?? clientName);
        setEnquiryFormEnabled(Boolean(data.enquiryFormEnabled));
        setPasswordRequired(false);
      }
    } catch {
      setError("Failed to verify password");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "grand-plan"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.postMessage({ type: "gp:print" }, "*");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-700" aria-hidden />
          <p className="text-sm text-slate-500">Loading plan…</p>
        </div>
      </div>
    );
  }

  if (error && !passwordRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-red-600">{error}</p>
          <p className="mt-2 text-sm text-slate-500">
            If you believe this is a mistake, please contact the i3media account manager who shared
            this link with you.
          </p>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <I3Logo className="mx-auto mb-6 h-7 w-auto text-slate-900" />
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
              <Lock className="h-5 w-5 text-indigo-600" aria-hidden />
            </div>
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
              Confidential pitch document
            </p>
            <h1 className="text-2xl leading-tight font-bold text-slate-900">{title}</h1>
            {clientName && (
              <p className="mt-1.5 text-sm text-slate-500">Prepared for {clientName}</p>
            )}
            <p className="mt-4 text-sm text-slate-600">
              This plan is password protected. Enter the password your i3media contact shared with
              you.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <label htmlFor="gp-share-pw" className="sr-only">
              Password
            </label>
            <input
              id="gp-share-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              autoFocus
              autoComplete="off"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "View plan"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">i3media</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Desktop CTA bar (top-right) — hidden on small screens */}
      <div className="fixed top-3 right-3 z-[200] hidden items-center gap-2 md:flex">
        <a
          href="https://calendly.com/i3media"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg transition-colors hover:bg-slate-50"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          Book a call
        </a>
        {enquiryFormEnabled && (
          <button
            onClick={() => setEnquiryOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg transition-colors hover:bg-slate-50"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Get in touch
          </button>
        )}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg transition-colors hover:bg-slate-50"
          aria-label={isPresentationView ? "Download PDF" : "Print"}
          title={isPresentationView ? "Download PDF" : "Print"}
        >
          <Printer className="h-4 w-4" aria-hidden />
          {isPresentationView ? "Download PDF" : "Print"}
        </button>
        <button
          onClick={handleDownloadHtml}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-slate-800"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download HTML
        </button>
      </div>

      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="block min-h-screen w-full border-0"
        title={title}
        sandbox="allow-scripts"
        style={{ height: "100vh" }}
        onLoad={() => {
          try {
            const body = iframeRef.current?.contentDocument?.body;
            if (body && iframeRef.current) {
              iframeRef.current.style.height = Math.max(body.scrollHeight, 600) + "px";
            }
          } catch {
            /* cross-origin */
          }
        }}
      />

      {/* Mobile bottom action bar — avoids colliding with the in-document sticky nav */}
      <div className="fixed inset-x-0 bottom-0 z-[200] flex items-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur md:hidden">
        <a
          href="https://calendly.com/i3media"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-900"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          Book a call
        </a>
        {enquiryFormEnabled && (
          <button
            onClick={() => setEnquiryOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
            aria-label="Get in touch"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
          aria-label={isPresentationView ? "Download PDF" : "Print"}
        >
          <Printer className="h-4 w-4" aria-hidden />
        </button>
        <button
          onClick={handleDownloadHtml}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white"
          aria-label="Download HTML"
        >
          <Download className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {enquiryFormEnabled && enquiryOpen && (
        <EnquiryModal
          token={token}
          title={title}
          clientName={clientName}
          onClose={() => setEnquiryOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Enquiry capture modal ──────────────────────────────────────────────────
// Submits to /api/share/grand-plan/[token]/enquiry which validates the plan
// has enquiryFormEnabled = true server-side. We don't trust client state alone.
function EnquiryModal({
  token,
  title,
  clientName,
  onClose,
}: {
  token: string;
  title: string;
  clientName: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch(`/api/share/grand-plan/${token}/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "Failed to send. Please try again.");
      } else {
        setDone(true);
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
              Get in touch
            </p>
            <h2 className="text-lg leading-tight font-bold text-slate-900">
              {clientName ? `Reply to ${clientName.split(" ")[0]}'s plan` : title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 transition-colors hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {done ? (
          <div className="px-6 pt-2 pb-6 text-center">
            <p className="text-sm leading-relaxed text-slate-700">
              Thanks — your message is on its way to the i3media team. We&apos;ll be in touch
              shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 px-6 pt-2 pb-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to discuss?"
              required
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={submitting || !name || !email || !message}
              className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Inline i3 logo so the password gate doesn't depend on the embedded HTML.
function I3Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 161 53"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="i3media"
      className={className}
    >
      <path
        d="M26.0013 0.853516C11.6413 0.853516 0 12.4947 0 26.8538C0 41.2136 11.6413 52.8535 26.0013 52.8535C40.362 52.8535 52.0033 41.2136 52.0033 26.8538C52.0033 12.4947 40.362 0.853516 26.0013 0.853516ZM17.6309 21.0628C18.8643 21.0598 19.8647 22.0577 19.8702 23.2935C19.8781 24.5225 18.8722 25.5247 17.6467 25.5247C16.4078 25.5278 15.4074 24.5353 15.4074 23.3044C15.3995 22.0711 16.3944 21.0683 17.6309 21.0628ZM40.3455 21.0598C39.7898 24.7824 38.4423 31.4889 38.4423 31.4889C38.4423 31.4889 37.7451 35.841 31.3004 35.8569C24.8539 35.8734 20.019 35.8868 20.019 35.8868C20.019 35.8868 19.5475 39.9833 13.7805 39.9943L16.6787 29.1662C16.6787 29.1662 17.5491 26.2896 22.5536 26.0804L21.2305 31.1638L31.1424 31.1394C31.1424 31.1394 33.5287 30.6783 33.7209 28.5477L23.2106 28.5776C23.2106 28.5776 23.7962 24.8281 28.1717 24.0773L33.6215 24.0584C33.6215 24.0584 34.8195 23.7192 34.8146 22.811V22.2443C34.8146 22.2443 34.7817 21.6155 33.9008 21.3337L23.6742 21.3666C23.6742 21.3666 20.3234 21.5453 20.307 16.6571L36.4439 16.6083C36.4439 16.6083 40.9067 17.3353 40.3455 21.0598Z"
        fill="currentColor"
      />
      <path
        d="M144.133 35.8645L149.848 19.3218H154.486L160.201 35.8645H156.742L152.355 21.8533H152.004L147.567 35.8645H144.133ZM147.166 32.4557V30.225H157.594V32.4557H147.166Z"
        fill="currentColor"
      />
      <path d="M138.913 35.8645V19.3218H142.122V35.8645H138.913Z" fill="currentColor" />
      <path
        d="M123.563 35.8645V33.2578H128.401C129.403 33.2578 130.231 33.0322 130.882 32.581C131.551 32.1299 132.044 31.4866 132.361 30.6511C132.696 29.8156 132.863 28.813 132.863 27.6433C132.863 26.6574 132.754 25.8052 132.537 25.0867C132.336 24.3682 132.027 23.7833 131.609 23.3321C131.192 22.8643 130.665 22.5134 130.03 22.2794C129.395 22.0455 128.651 21.9285 127.799 21.9285H123.563V19.3218H127.699C129.654 19.3218 131.25 19.6476 132.487 20.2993C133.74 20.951 134.659 21.8867 135.244 23.1066C135.846 24.3097 136.147 25.7634 136.147 27.4678C136.147 28.6709 136.005 29.7404 135.721 30.6761C135.436 31.5952 135.052 32.3889 134.567 33.0573C134.083 33.709 133.515 34.2437 132.863 34.6614C132.211 35.0792 131.509 35.3883 130.757 35.5888C130.022 35.7726 129.261 35.8645 128.476 35.8645H123.563ZM122.008 35.8645V19.3218H125.167V35.8645H122.008Z"
        fill="currentColor"
      />
      <path
        d="M107.208 35.8645V19.3218H110.392V35.8645H107.208ZM109.264 35.8645V33.2578H119.567V35.8645H109.264ZM109.264 28.6709V26.2647H118.338V28.6709H109.264ZM109.264 21.9285V19.3218H119.517V21.9285H109.264Z"
        fill="currentColor"
      />
      <path
        d="M84.55 35.8645V19.3218H89.338L94.2514 32.3304H94.3767L99.2149 19.3218H103.802V35.8645H100.794L100.995 22.5301H100.744L95.5048 35.8645H92.7473L87.5833 22.5301H87.3326L87.5331 35.8645H84.55Z"
        fill="currentColor"
      />
      <path
        d="M75.2092 36.2156C74.1396 36.2156 73.2121 36.0986 72.4266 35.8647C71.6412 35.6475 70.981 35.3383 70.4462 34.9373C69.9282 34.5196 69.5271 34.0099 69.243 33.4084C68.9589 32.8068 68.7834 32.1384 68.7166 31.4032L71.6244 30.5008C71.6412 31.0857 71.7498 31.5786 71.9503 31.9797C72.1509 32.3807 72.4183 32.7149 72.7525 32.9822C73.0868 33.2329 73.4711 33.4167 73.9056 33.5337C74.3402 33.6506 74.7914 33.7091 75.2593 33.7091C75.9445 33.7091 76.5545 33.6172 77.0893 33.4334C77.6241 33.2329 78.0502 32.9321 78.3678 32.5311C78.6853 32.1133 78.8441 31.5786 78.8441 30.9269C78.8441 30.1249 78.5767 29.4815 78.0419 28.9969C77.5238 28.4957 76.7634 28.1531 75.7607 27.9693C74.758 27.7855 73.538 27.7437 72.1007 27.844V25.9641L77.7661 22.054V21.8535L69.4937 21.9036V19.2969H80.9498V22.3798L75.6604 26.1396V26.3651C77.2313 26.2983 78.4764 26.4738 79.3956 26.8915C80.3147 27.3093 80.9748 27.7821 81.3759 28.5959C81.777 29.3144 81.9776 30.1165 81.9776 31.0021C81.9776 32.0549 81.7269 32.9739 81.2255 33.7593C80.7409 34.5446 79.9972 35.1545 78.9945 35.589C77.9917 36.0067 76.73 36.2156 75.2092 36.2156Z"
        fill="currentColor"
      />
      <path
        d="M63.6388 35.8647V22.7558H66.797V35.8647H63.6388ZM65.2179 20.7005C64.5829 20.7005 64.09 20.5668 63.7391 20.2994C63.4049 20.0154 63.2378 19.6143 63.2378 19.0963C63.2378 18.5783 63.4049 18.1856 63.7391 17.9183C64.09 17.6342 64.5829 17.4922 65.2179 17.4922C65.8863 17.4922 66.3876 17.6259 66.7218 17.8932C67.056 18.1606 67.2231 18.5616 67.2231 19.0963C67.2231 19.6143 67.0476 20.0154 66.6967 20.2994C66.3625 20.5668 65.8696 20.7005 65.2179 20.7005Z"
        fill="currentColor"
      />
    </svg>
  );
}
