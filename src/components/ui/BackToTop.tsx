"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button that appears when the user scrolls
 * past a threshold. Attaches to the nearest scrollable parent with
 * class `.app-main`, falling back to `window`.
 */
export function BackToTop({ threshold = 400 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollEl = document.querySelector(".app-main") as HTMLElement | null;
    const target = scrollEl ?? window;

    function onScroll() {
      const y = scrollEl ? scrollEl.scrollTop : window.scrollY;
      setVisible(y > threshold);
    }

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [threshold]);

  function scrollToTop() {
    const scrollEl = document.querySelector(".app-main") as HTMLElement | null;
    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: "var(--z-sticky)" as unknown as number,
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid var(--border)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "var(--shadow), var(--glass-shine)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-2)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <ArrowUp style={{ width: 16, height: 16 }} />
    </button>
  );
}
