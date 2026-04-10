"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  /** Target value to count up to */
  value: number;
  /** Duration in ms. Default: 800 */
  duration?: number;
  /** Number of decimal places. Default: 0 */
  decimals?: number;
  /** Prefix string (e.g. "£", "$") */
  prefix?: string;
  /** Suffix string (e.g. "%", "x") */
  suffix?: string;
  /** Use locale formatting (commas). Default: true */
  locale?: boolean;
  /** CSS class name */
  className?: string;
  /** CSS inline style */
  style?: React.CSSProperties;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animated count-up number. Counts from 0 to `value` on mount
 * using requestAnimationFrame with an ease-out curve.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = true,
  className,
  style,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState("0");
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) {
      setDisplay(format(0));
      return;
    }

    startRef.current = null;

    function animate(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = eased * value;

      setDisplay(format(current));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(format(value));
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, decimals]);

  function format(n: number): string {
    if (locale && decimals === 0) return Math.round(n).toLocaleString();
    if (locale) return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return n.toFixed(decimals);
  }

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }} suppressHydrationWarning>
      {prefix}{display}{suffix}
    </span>
  );
}
