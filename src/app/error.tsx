"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showStack, setShowStack] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 560 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--danger-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 24,
          }}
        >
          !
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16, lineHeight: 1.6 }}>
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        {error.digest && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-4)",
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            Digest: {error.digest}
          </p>
        )}

        {error.stack && (
          <div style={{ marginBottom: 20, textAlign: "left" }}>
            <button
              onClick={() => setShowStack((s) => !s)}
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {showStack ? "Hide" : "Show"} stack trace
            </button>
            {showStack && (
              <pre
                style={{
                  marginTop: 8,
                  padding: "12px 14px",
                  borderRadius: 6,
                  background: "var(--text)",
                  color: "#cdd6f4",
                  fontSize: 11,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textAlign: "left",
                }}
              >
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <a
            href="/admin/logs"
            style={{
              display: "inline-block",
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 6,
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              textDecoration: "none",
              background: "var(--card-bg, #fff)",
            }}
          >
            View server logs
          </a>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 20, lineHeight: 1.6 }}>
          If this keeps happening, contact{" "}
          <a
            href="mailto:nick@bettsandburton.com"
            style={{ color: "var(--accent)", textDecoration: "underline" }}
          >
            nick@bettsandburton.com
          </a>
        </p>
      </div>
    </div>
  );
}
