"use client";

import { useState, useEffect, use } from "react";
import { Loader2, Lock, Download } from "lucide-react";

export default function ContentStrategySharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/share/content-strategy/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.passwordRequired) {
          setPasswordRequired(true);
          setTitle(data.title);
        } else {
          setTitle(data.title);
          setHtml(data.html);
        }
      })
      .catch(() => setError("Failed to load content strategy"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/share/content-strategy/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setHtml(data.html);
        setPasswordRequired(false);
      }
    } catch {
      setError("Failed to verify password");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "content-strategy"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading content strategy...</p>
        </div>
      </div>
    );
  }

  if (error && !passwordRequired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border shadow-sm p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="h-10 w-10 text-purple-600 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              This content strategy is password protected.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Verifying..." : "View Strategy"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Download bar */}
      <div className="fixed top-0 right-0 z-[200] p-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-lg"
        >
          <Download className="h-4 w-4" />
          Download HTML
        </button>
      </div>

      {/* Render the full standalone HTML in an iframe */}
      <iframe
        srcDoc={html}
        className="w-full min-h-screen border-0"
        title={title}
        sandbox="allow-scripts"
        style={{ height: "100vh" }}
        onLoad={(e) => {
          // Auto-resize iframe to content height
          const iframe = e.target as HTMLIFrameElement;
          try {
            const body = iframe.contentDocument?.body;
            if (body) {
              iframe.style.height = body.scrollHeight + "px";
            }
          } catch {
            // Cross-origin — keep default height
          }
        }}
      />
    </div>
  );
}
