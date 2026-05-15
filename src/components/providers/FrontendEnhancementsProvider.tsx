"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface FrontendEnhancementsProviderProps {
  children: React.ReactNode;
}

export function FrontendEnhancementsProvider({ children }: FrontendEnhancementsProviderProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const lenisEnabled = process.env.NEXT_PUBLIC_ENABLE_LENIS !== "0";
  const isReportLikePath =
    pathname.startsWith("/reports") ||
    pathname.includes("/report/") ||
    pathname.endsWith("/print") ||
    pathname.startsWith("/share/report");

  useEffect(() => {
    gsap.defaults({
      ease: "power2.out",
      duration: 0.6,
    });
  }, []);

  useEffect(() => {
    if (!lenisEnabled) return;
    if (isReportLikePath) return;

    // App-shell routes use .app-main as their native scroll container.
    // Running Lenis globally on these routes can swallow wheel/touch events.
    if (document.querySelector(".app-main")) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
      prevent: (node) => {
        const element = node as HTMLElement | null;
        return Boolean(element?.closest?.(".app-main, [data-lenis-prevent], [data-native-scroll]"));
      },
    });

    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [isReportLikePath, lenisEnabled, pathname]);

  if (isReportLikePath) {
    return <>{children}</>;
  }

  const initial = prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 };
  const animate = { opacity: 1, y: 0 };
  const exit = prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
