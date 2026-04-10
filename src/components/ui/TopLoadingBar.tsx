"use client";

import { useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import { usePathname } from "next/navigation";

// External store for loading bar state — avoids setState-in-effect lint warnings
let _progress = 0;
let _visible = false;
let _snapshot = { progress: _progress, visible: _visible };
const _listeners = new Set<() => void>();

function getSnapshot() { return _snapshot; }
function subscribe(cb: () => void) { _listeners.add(cb); return () => { _listeners.delete(cb); }; }
function notify() { _listeners.forEach((cb) => cb()); }
function setBar(progress: number, visible: boolean) {
  if (_progress === progress && _visible === visible) return;
  _progress = progress;
  _visible = visible;
  _snapshot = { progress, visible };
  notify();
}

/**
 * NProgress-style loading bar at the top of the page.
 * Triggered automatically on route changes via Next.js pathname.
 */
export function TopLoadingBar() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const { progress, visible } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const startLoading = useCallback(() => {
    setBar(15, true);

    let current = 15;
    timerRef.current = setInterval(() => {
      current += Math.random() * 12;
      if (current > 90) current = 90;
      setBar(current, true);
    }, 200);

    const finish = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setBar(100, true);
      setTimeout(() => setBar(0, false), 250);
    }, 350);

    return finish;
  }, []);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    const finish = startLoading();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(finish);
    };
  }, [pathname, startLoading]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: "var(--z-toast)" as unknown as number,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--gradient-accent)",
          borderRadius: "0 2px 2px 0",
          boxShadow: "0 0 12px rgb(99 102 241 / 0.4)",
          transition: progress === 100
            ? "width 0.2s ease, opacity 0.25s ease 0.1s"
            : "width 0.4s cubic-bezier(0.4,0,0.2,1)",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
