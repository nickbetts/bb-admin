"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, background: "var(--bg)" }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
          !
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="btn btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
