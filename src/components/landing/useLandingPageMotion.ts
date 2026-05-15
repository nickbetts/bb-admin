"use client";

import { useEffect, useState } from "react";

interface UseLandingPageMotionOptions {
  navIds: string[];
  statsSectionId?: string;
  revealSelector?: string;
}

interface LandingPageMotionState {
  scrollPct: number;
  activeSection: string;
  mouse: { x: number; y: number };
  statsVisible: boolean;
  parallaxY: number;
}

export function useLandingPageMotion({
  navIds,
  statsSectionId = "stats-row",
  revealSelector = ".reveal-section",
}: UseLandingPageMotionOptions): LandingPageMotionState {
  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const [statsVisible, setStatsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  const navIdsKey = navIds.join("|");

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      const pct = scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0;
      setScrollPct(pct);
      setParallaxY(el.scrollTop * 0.25);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    const ids = navIdsKey
      .split("|")
      .map((id) => id.trim())
      .filter(Boolean);

    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-35% 0px -60% 0px" },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [navIdsKey]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("section-visible");
          if (entry.target.id === statsSectionId) setStatsVisible(true);
        });
      },
      { threshold: 0.1 },
    );

    document
      .querySelectorAll<Element>(revealSelector)
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [revealSelector, statsSectionId]);

  return {
    scrollPct,
    activeSection,
    mouse,
    statsVisible,
    parallaxY,
  };
}
