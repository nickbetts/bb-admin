"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  /** Text to copy to clipboard */
  text: string;
  /** Button size in px. Default: 28 */
  size?: number;
  /** Icon size in px. Default: 14 */
  iconSize?: number;
  /** Tooltip text. Default: "Copy" */
  label?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Copy-to-clipboard button with animated tick feedback.
 * Shows a green tick for 2 seconds after clicking.
 */
export function CopyButton({
  text,
  size = 28,
  iconSize = 14,
  label = "Copy",
  style,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : label}
      aria-label={copied ? "Copied to clipboard" : label}
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--border)",
        background: copied ? "var(--success-bg)" : "var(--surface)",
        color: copied ? "var(--success)" : "var(--text-3)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flexShrink: 0,
        ...style,
      }}
    >
      {copied ? (
        <Check style={{ width: iconSize, height: iconSize, transition: "transform 0.15s", transform: "scale(1.1)" }} />
      ) : (
        <Copy style={{ width: iconSize, height: iconSize }} />
      )}
    </button>
  );
}
