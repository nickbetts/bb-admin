"use client";

import { useEffect, useState } from "react";

/**
 * Thin progress bar fixed at the very top of the viewport that
 * fills as the user scrolls down .app-main (or window fallback).
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".app-main") ?? undefined;
    const target = el ?? window;

    function update() {
      if (el) {
        const scrollable = el.scrollHeight - el.clientHeight;
        setProgress(scrollable > 0 ? el.scrollTop / scrollable : 0);
      } else {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(scrollable > 0 ? window.scrollY / scrollable : 0);
      }
    }

    target.addEventListener("scroll", update, { passive: true });
    update();
    return () => target.removeEventListener("scroll", update);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className="scroll-progress"
      style={{ width: `${Math.min(progress * 100, 100)}%` }}
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    />
  );
}
