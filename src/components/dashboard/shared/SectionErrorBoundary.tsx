"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional channel name shown in the error message */
  channel?: string;
  /** Optional fallback UI override */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("[SectionErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const { channel, } = this.props;
    const label = channel ? ` — ${channel}` : "";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "40px 24px",
          background: "var(--danger-bg, #fef2f2)",
          border: "1px solid var(--danger-border, #fecaca)",
          borderRadius: "var(--r-lg)",
          textAlign: "center",
        }}
      >
        <AlertTriangle style={{ width: 24, height: 24, color: "var(--danger, #ef4444)", flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            Something went wrong{label}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)", maxWidth: 400 }}>
            {this.state.errorMessage}
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="btn btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw style={{ width: 12, height: 12 }} />
          Try again
        </button>
      </div>
    );
  }
}
