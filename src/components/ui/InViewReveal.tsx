"use client";

import { cn } from "@/lib/utils";
import { motion, type Transition } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { motionSurfaceVariants, type MotionSurfaceVariantProps } from "./motion-variants";

type RevealTag = "div" | "section" | "article";

interface InViewRevealProps extends MotionSurfaceVariantProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  once?: boolean;
  threshold?: number;
  as?: RevealTag;
}

export function InViewReveal({
  children,
  className,
  delay = 0,
  duration = 0.5,
  y = 16,
  once = true,
  threshold = 0.15,
  as = "div",
  tone,
  elevation,
}: InViewRevealProps) {
  const { ref, inView } = useInView({
    triggerOnce: once,
    threshold,
  });

  const transition: Transition = {
    duration,
    delay,
    ease: [0.22, 1, 0.36, 1],
  };

  const baseClassName = cn(motionSurfaceVariants({ tone, elevation }), className);

  if (as === "section") {
    return (
      <motion.section
        ref={ref}
        className={baseClassName}
        initial={{ opacity: 0, y }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
        transition={transition}
      >
        {children}
      </motion.section>
    );
  }

  if (as === "article") {
    return (
      <motion.article
        ref={ref}
        className={baseClassName}
        initial={{ opacity: 0, y }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
        transition={transition}
      >
        {children}
      </motion.article>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={baseClassName}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
